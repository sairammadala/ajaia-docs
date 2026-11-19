import bcrypt from "bcryptjs";
import type { Pool } from "pg";
import { getPool } from "@/lib/db";
import { resolveAccess } from "@/lib/access";
import type { Access, DashboardDoc, DocumentRow, Role, User } from "@/lib/types";

/**
 * Data-access layer. Every function takes the acting user's id and enforces
 * authorization here (owner / editor / viewer), so the rules live in one
 * place and are covered by integration tests against a real Postgres.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;

export class StoreError extends Error {
  constructor(
    message: string,
    public code: "invalid" | "conflict" | "unauthorized" | "forbidden" | "not_found",
  ) {
    super(message);
  }
}

type Db = Pick<Pool, "query">;
const db = (pool?: Db): Db => pool ?? getPool();

export interface ShareEntry {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/* ----------------------------- users ----------------------------- */

export async function registerUser(
  input: { email: string; password: string; name?: string },
  pool?: Db,
): Promise<User> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new StoreError("Enter a valid email address.", "invalid");
  if (input.password.length < MIN_PASSWORD) {
    throw new StoreError(`Password must be at least ${MIN_PASSWORD} characters.`, "invalid");
  }
  const name = (input.name ?? "").trim().slice(0, 80) || email.split("@")[0];
  const hash = await bcrypt.hash(input.password, 10);
  try {
    const { rows } = await db(pool).query(
      "insert into users (email, display_name, password_hash) values ($1, $2, $3) returning id, email, display_name",
      [email, name, hash],
    );
    return rows[0] as User;
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      throw new StoreError("An account with that email already exists.", "conflict");
    }
    throw err;
  }
}

let dummyHash: string | null = null;

export async function authenticate(email: string, password: string, pool?: Db): Promise<User> {
  const { rows } = await db(pool).query(
    "select id, email, display_name, password_hash from users where lower(email) = lower($1)",
    [email.trim()],
  );
  const row = rows[0];
  // Compare against a dummy hash for unknown users so timing doesn't leak existence.
  dummyHash ??= await bcrypt.hash("not-a-real-password", 10);
  const ok = await bcrypt.compare(password, row?.password_hash ?? dummyHash);
  if (!row || !ok) throw new StoreError("Incorrect email or password.", "unauthorized");
  return { id: row.id, email: row.email, display_name: row.display_name };
}

export async function getUserById(id: string, pool?: Db): Promise<User | null> {
  if (!isUuid(id)) return null;
  const { rows } = await db(pool).query(
    "select id, email, display_name from users where id = $1",
    [id],
  );
  return (rows[0] as User) ?? null;
}

/* --------------------------- documents --------------------------- */

export async function createDocument(
  userId: string,
  input: { title?: string; content?: string } = {},
  pool?: Db,
): Promise<DocumentRow> {
  const title = (input.title ?? "").trim().slice(0, 200) || "Untitled document";
  const { rows } = await db(pool).query(
    "insert into documents (owner_id, title, content) values ($1, $2, $3) returning *",
    [userId, title, input.content ?? "<p></p>"],
  );
  return rows[0] as DocumentRow;
}

function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|h[1-6]|li|blockquote)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Everything the user owns or that has been shared with them, newest first. */
export async function listDocuments(userId: string, pool?: Db): Promise<DashboardDoc[]> {
  const { rows } = await db(pool).query(
    `select d.id, d.title, left(d.content, 1500) as content, d.updated_at,
            u.display_name as owner_name, u.email as owner_email,
            case when d.owner_id = $1 then 'owner' else s.role end as role,
            (select count(*)::int from document_shares x where x.document_id = d.id) as shared_count
       from documents d
       join users u on u.id = d.owner_id
       left join document_shares s on s.document_id = d.id and s.shared_with = $1
      where d.owner_id = $1 or s.shared_with = $1
      order by d.updated_at desc`,
    [userId],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    // Skip a leading H1: it usually just repeats the title shown above the snippet.
    snippet: stripHtml(String(r.content).replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>/i, "")).slice(0, 140),
    updated_at: r.updated_at,
    owner_name: r.owner_name,
    owner_email: r.owner_email,
    role: r.role,
    shared_count: r.role === "owner" ? r.shared_count : 0,
  }));
}

export interface LoadedDocument {
  document: DocumentRow;
  access: Access;
  owner: User;
  /** Populated for the owner only. */
  shares: ShareEntry[];
}

/** Load a document for a user. Returns null if it doesn't exist or the user has no access. */
export async function getDocument(
  userId: string,
  docId: string,
  pool?: Db,
): Promise<LoadedDocument | null> {
  if (!isUuid(docId)) return null;
  const client = db(pool);
  const { rows } = await client.query("select * from documents where id = $1", [docId]);
  const document = rows[0] as DocumentRow | undefined;
  if (!document) return null;

  const { rows: shareRows } = await client.query(
    `select s.id, s.shared_with, s.role, u.email, u.display_name
       from document_shares s join users u on u.id = s.shared_with
      where s.document_id = $1 order by s.created_at`,
    [docId],
  );
  const access = resolveAccess(
    document,
    shareRows.map((s) => ({ shared_with: s.shared_with, role: s.role })),
    userId,
  );
  if (!access.canView) return null;

  const { rows: ownerRows } = await client.query(
    "select id, email, display_name from users where id = $1",
    [document.owner_id],
  );
  return {
    document,
    access,
    owner: ownerRows[0] as User,
    shares: access.isOwner
      ? shareRows.map((s) => ({ id: s.id, email: s.email, name: s.display_name, role: s.role }))
      : [],
  };
}

async function requireAccess(userId: string, docId: string, need: "edit" | "owner", pool?: Db) {
  const loaded = await getDocument(userId, docId, pool);
  if (!loaded) throw new StoreError("Document not found.", "not_found");
  if (need === "owner" && !loaded.access.isOwner) {
    throw new StoreError("Only the owner can do that.", "forbidden");
  }
  if (need === "edit" && !loaded.access.canEdit) {
    throw new StoreError("You have view-only access to this document.", "forbidden");
  }
  return loaded;
}

/** Update title and/or content. Owner or editor only. */
export async function updateDocument(
  userId: string,
  docId: string,
  patch: { title?: string; content?: string },
  pool?: Db,
): Promise<{ updated_at: string }> {
  await requireAccess(userId, docId, "edit", pool);
  const title =
    patch.title === undefined ? null : patch.title.trim().slice(0, 200) || "Untitled document";
  const { rows } = await db(pool).query(
    `update documents
        set title = coalesce($2, title), content = coalesce($3, content), updated_at = now()
      where id = $1 returning updated_at`,
    [docId, title, patch.content ?? null],
  );
  return rows[0] as { updated_at: string };
}

export async function deleteDocument(userId: string, docId: string, pool?: Db): Promise<void> {
  await requireAccess(userId, docId, "owner", pool);
  await db(pool).query("delete from documents where id = $1", [docId]);
}

/* ---------------------------- sharing ---------------------------- */

function assertRole(role: string): asserts role is Role {
  if (role !== "viewer" && role !== "editor") throw new StoreError("Choose a valid role.", "invalid");
}

export async function shareDocument(
  userId: string,
  docId: string,
  email: string,
  role: Role,
  pool?: Db,
): Promise<ShareEntry> {
  assertRole(role);
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) throw new StoreError("Enter a valid email address.", "invalid");

  const { document } = await requireAccess(userId, docId, "owner", pool);
  const { rows: found } = await db(pool).query(
    "select id, email, display_name from users where lower(email) = $1",
    [normalized],
  );
  const target = found[0];
  if (!target) {
    throw new StoreError("No user with that email. They need to create an account first.", "not_found");
  }
  if (target.id === document.owner_id) {
    throw new StoreError("That person already owns this document.", "conflict");
  }
  const { rows } = await db(pool).query(
    `insert into document_shares (document_id, shared_with, role) values ($1, $2, $3)
     on conflict (document_id, shared_with) do update set role = excluded.role
     returning id`,
    [docId, target.id, role],
  );
  return { id: rows[0].id, email: target.email, name: target.display_name, role };
}

export async function updateShareRole(
  userId: string,
  docId: string,
  shareId: string,
  role: Role,
  pool?: Db,
): Promise<void> {
  assertRole(role);
  await requireAccess(userId, docId, "owner", pool);
  if (!isUuid(shareId)) throw new StoreError("Share not found.", "not_found");
  await db(pool).query("update document_shares set role = $3 where id = $1 and document_id = $2", [
    shareId,
    docId,
    role,
  ]);
}

export async function revokeShare(
  userId: string,
  docId: string,
  shareId: string,
  pool?: Db,
): Promise<void> {
  await requireAccess(userId, docId, "owner", pool);
  if (!isUuid(shareId)) throw new StoreError("Share not found.", "not_found");
  await db(pool).query("delete from document_shares where id = $1 and document_id = $2", [
    shareId,
    docId,
  ]);
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
