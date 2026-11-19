/**
 * Idempotent demo seed: two accounts, Alice owns two documents and has shared
 * one of them with Bob as an editor.
 *
 *   node scripts/seed.mjs   (needs DATABASE_URL; run migrations first)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import pg from "pg";

export const SEED_PASSWORD = "Password123";

const WELCOME = `
<h1>Welcome to Ajaia Docs</h1>
<p>This document is owned by <strong>Alice</strong> and shared with <strong>Bob</strong> as an <em>editor</em>. Sign in as either account to see how ownership and sharing look different on the dashboard.</p>
<h2>Try this</h2>
<ul>
  <li>Edit this text. Changes autosave and survive a refresh.</li>
  <li>Use the toolbar for <strong>bold</strong>, <em>italic</em> and <u>underline</u>.</li>
  <li>Open <strong>Share</strong> (as Alice) to invite someone else.</li>
</ul>
<h2>Checklist</h2>
<ol>
  <li>Sign in as Bob in a private window</li>
  <li>Edit this document as Bob</li>
  <li>Watch the change show up for Alice</li>
</ol>`;

const PRIVATE = `
<h1>Q3 planning notes</h1>
<p>This one is <strong>private to Alice</strong>. Bob should not see it on his dashboard.</p>
<ul><li>Hiring plan</li><li>Roadmap risks</li><li>Budget review</li></ul>`;

export async function seed(pool, log = console.log) {
  const hash = await bcrypt.hash(SEED_PASSWORD, 10);
  const ids = {};
  for (const [email, name] of [
    ["alice@ajaia.test", "Alice"],
    ["bob@ajaia.test", "Bob"],
  ]) {
    const { rows } = await pool.query(
      `insert into users (email, display_name, password_hash) values ($1, $2, $3)
       on conflict (lower(email)) do update set display_name = excluded.display_name
       returning id`,
      [email, name, hash],
    );
    ids[name] = rows[0].id;
  }

  async function ensureDoc(ownerId, title, content) {
    const found = await pool.query("select id from documents where owner_id = $1 and title = $2", [ownerId, title]);
    if (found.rows[0]) return found.rows[0].id;
    const { rows } = await pool.query(
      "insert into documents (owner_id, title, content) values ($1, $2, $3) returning id",
      [ownerId, title, content],
    );
    return rows[0].id;
  }

  const welcomeId = await ensureDoc(ids.Alice, "Welcome to Ajaia Docs", WELCOME);
  await ensureDoc(ids.Alice, "Q3 planning notes (private)", PRIVATE);
  await pool.query(
    `insert into document_shares (document_id, shared_with, role) values ($1, $2, 'editor')
     on conflict (document_id, shared_with) do update set role = 'editor'`,
    [welcomeId, ids.Bob],
  );
  log("[seed] alice@ajaia.test / bob@ajaia.test ready (password: " + SEED_PASSWORD + ")");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await seed(pool);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
