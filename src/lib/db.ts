import { Pool, types } from "pg";

// Return timestamptz as ISO strings so values serialize cleanly to the client.
types.setTypeParser(1184, (v) => new Date(v).toISOString());

const globalForPg = globalThis as unknown as { __pgPool?: Pool };

export function getPool(): Pool {
  if (!globalForPg.__pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    globalForPg.__pgPool = new Pool({ connectionString, max: 10 });
  }
  return globalForPg.__pgPool;
}

export async function closePool() {
  await globalForPg.__pgPool?.end();
  globalForPg.__pgPool = undefined;
}
