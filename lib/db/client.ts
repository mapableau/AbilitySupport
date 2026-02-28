// Uncomment when Next.js is set up — prevents accidental client-side import:
// import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

/**
 * Build a Drizzle client backed by Neon's HTTP transport.
 *
 * The HTTP driver is stateless (no persistent connection), edge-compatible,
 * and ideal for serverless functions. Each call is one HTTP request to Neon.
 *
 * For interactive transactions (read-then-decide-then-write within a single
 * TX) use the helpers in ./tx.ts instead — they use a WebSocket Pool.
 */
function createDb(url: string): NeonHttpDatabase<typeof schema> {
  const sql = neon(url);
  return drizzle({ client: sql, schema });
}

// ---------------------------------------------------------------------------
// Singleton — survives Next.js HMR by stashing on `globalThis`.
// In production only one instance is created per cold start.
// ---------------------------------------------------------------------------

const globalForDb = globalThis as unknown as {
  __drizzle_db: NeonHttpDatabase<typeof schema> | undefined;
};

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example → .env.local and fill it in.",
    );
  }
  return url;
}

/**
 * The primary database client. Import from `@/lib/db`.
 *
 * ```ts
 * import { db } from "@/lib/db";
 * const rows = await db.select().from(providers);
 * ```
 */
export const db: NeonHttpDatabase<typeof schema> =
  globalForDb.__drizzle_db ?? createDb(getDatabaseUrl());

if (process.env.NODE_ENV !== "production") {
  globalForDb.__drizzle_db = db;
}

export type Database = typeof db;
