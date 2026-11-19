/**
 * Minimal forward-only migration runner.
 * Applies db/migrations/*.sql in filename order, once each, tracked in the
 * schema_migrations table. Safe to run on every startup.
 *
 *   node scripts/migrate.mjs            (CLI; needs DATABASE_URL)
 *   import { runMigrations } from "./migrate.mjs"
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(here, "..", "db", "migrations");

export async function runMigrations(pool, log = console.log) {
  const client = await pool.connect();
  try {
    // Advisory lock so concurrent starters don't race each other.
    await client.query("select pg_advisory_lock(727274)");
    await client.query(
      "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    const done = new Set((await client.query("select name from schema_migrations")).rows.map((r) => r.name));
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      if (done.has(file)) continue;
      log(`[migrate] applying ${file}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("insert into schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        throw err;
      }
    }
    log("[migrate] up to date");
  } finally {
    await client.query("select pg_advisory_unlock(727274)").catch(() => {});
    client.release();
  }
}

/** Retry the first connection: in Docker the DB may still be booting. */
export async function waitForDb(pool, attempts = 30, delayMs = 1000) {
  for (let i = 1; ; i++) {
    try {
      await pool.query("select 1");
      return;
    } catch (err) {
      if (i >= attempts) throw err;
      console.log(`[migrate] waiting for database (${i}/${attempts})…`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await waitForDb(pool);
    await runMigrations(pool);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
