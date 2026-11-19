import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { runMigrations, waitForDb } from "../../scripts/migrate.mjs";
import { closePool, getPool } from "@/lib/db";
import { signSession, verifySession } from "@/lib/jwt";
import {
  authenticate,
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  registerUser,
  revokeShare,
  shareDocument,
  StoreError,
  updateDocument,
  updateShareRole,
} from "@/lib/store";

/**
 * End-to-end tests of the real data layer against a real Postgres:
 * register -> create -> fetch -> update -> share -> second user sees it,
 * plus the permission edges (viewer can't edit, strangers get nothing).
 */

const run = randomUUID().slice(0, 8);
const emailA = `alice-${run}@ajaia.test`;
const emailB = `bob-${run}@ajaia.test`;
const emailC = `carol-${run}@ajaia.test`;
const password = "Password123";

let alice: { id: string };
let bob: { id: string };
let carol: { id: string };

beforeAll(async () => {
  const pool = getPool();
  await waitForDb(pool, 10, 500);
  await runMigrations(pool, () => {});
  alice = await registerUser({ email: emailA, password, name: "Alice" });
  bob = await registerUser({ email: emailB, password, name: "Bob" });
  carol = await registerUser({ email: emailC, password, name: "Carol" });
});

afterAll(async () => {
  await getPool().query("delete from users where email = any($1)", [[emailA, emailB, emailC]]);
  await closePool();
});

describe("accounts", () => {
  it("rejects duplicate emails (case-insensitive) and bad input", async () => {
    await expect(registerUser({ email: emailA.toUpperCase(), password })).rejects.toMatchObject({
      code: "conflict",
    });
    await expect(registerUser({ email: "nope", password })).rejects.toBeInstanceOf(StoreError);
    await expect(registerUser({ email: `x-${run}@ajaia.test`, password: "short" })).rejects.toBeInstanceOf(
      StoreError,
    );
  });

  it("authenticates with the right password only", async () => {
    const user = await authenticate(emailA, password);
    expect(user.id).toBe(alice.id);
    await expect(authenticate(emailA, "wrong-password")).rejects.toMatchObject({ code: "unauthorized" });
    await expect(authenticate(`ghost-${run}@ajaia.test`, password)).rejects.toMatchObject({
      code: "unauthorized",
    });
  });

  it("issues and verifies session tokens", async () => {
    const token = await signSession(alice.id);
    expect(await verifySession(token)).toBe(alice.id);
    expect(await verifySession(token + "x")).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
  });
});

describe("documents and sharing", () => {
  let docId: string;

  it("creates, fetches and updates a document with formatting intact", async () => {
    const created = await createDocument(alice.id, { title: "Spec" });
    docId = created.id;
    expect(created.owner_id).toBe(alice.id);

    const html = "<h1>Title</h1><p><strong>bold</strong> <em>it</em> <u>under</u></p><ul><li>a</li></ul><ol><li>b</li></ol>";
    await updateDocument(alice.id, docId, { title: "Spec v2", content: html });

    const loaded = await getDocument(alice.id, docId);
    expect(loaded?.document.title).toBe("Spec v2");
    expect(loaded?.document.content).toBe(html);
    expect(loaded?.access).toMatchObject({ isOwner: true, canEdit: true });
  });

  it("hides the document from users it hasn't been shared with", async () => {
    expect(await getDocument(bob.id, docId)).toBeNull();
    expect((await listDocuments(bob.id)).some((d) => d.id === docId)).toBe(false);
    await expect(updateDocument(bob.id, docId, { content: "<p>hax</p>" })).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("shares by email and the second user sees it as shared", async () => {
    const share = await shareDocument(alice.id, docId, emailB.toUpperCase(), "viewer");
    expect(share.role).toBe("viewer");

    const list = await listDocuments(bob.id);
    const row = list.find((d) => d.id === docId);
    expect(row).toBeDefined();
    expect(row?.role).toBe("viewer");
    expect(row?.owner_name).toBe("Alice");

    // Alice sees it as owned, with a share count.
    const mine = (await listDocuments(alice.id)).find((d) => d.id === docId);
    expect(mine).toMatchObject({ role: "owner", shared_count: 1 });
  });

  it("keeps viewers read-only", async () => {
    const loaded = await getDocument(bob.id, docId);
    expect(loaded?.access).toMatchObject({ canView: true, canEdit: false, isOwner: false });
    expect(loaded?.shares).toEqual([]); // viewers don't see the sharing list
    await expect(updateDocument(bob.id, docId, { content: "<p>nope</p>" })).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(shareDocument(bob.id, docId, emailC, "editor")).rejects.toMatchObject({ code: "forbidden" });
    await expect(deleteDocument(bob.id, docId)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("lets an editor edit once the owner upgrades them, but not delete", async () => {
    const loaded = await getDocument(alice.id, docId);
    const shareId = loaded!.shares.find((s) => s.email === emailB)!.id;
    await updateShareRole(alice.id, docId, shareId, "editor");

    await updateDocument(bob.id, docId, { content: "<p>edited by bob</p>" });
    const after = await getDocument(alice.id, docId);
    expect(after?.document.content).toBe("<p>edited by bob</p>");
    await expect(deleteDocument(bob.id, docId)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("validates share targets", async () => {
    await expect(shareDocument(alice.id, docId, `nobody-${run}@ajaia.test`, "viewer")).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(shareDocument(alice.id, docId, emailA, "viewer")).rejects.toMatchObject({ code: "conflict" });
    await expect(shareDocument(alice.id, docId, emailC, "admin" as never)).rejects.toMatchObject({
      code: "invalid",
    });
  });

  it("revokes access", async () => {
    const loaded = await getDocument(alice.id, docId);
    const shareId = loaded!.shares.find((s) => s.email === emailB)!.id;
    await revokeShare(alice.id, docId, shareId);
    expect(await getDocument(bob.id, docId)).toBeNull();
  });

  it("lets the owner delete", async () => {
    await deleteDocument(alice.id, docId);
    expect(await getDocument(alice.id, docId)).toBeNull();
  });

  it("returns null for malformed ids instead of throwing", async () => {
    expect(await getDocument(alice.id, "not-a-uuid")).toBeNull();
  });
});
