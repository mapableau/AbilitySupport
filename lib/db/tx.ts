// Uncomment when Next.js is set up:
// import "server-only";

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema.js";

// ---------------------------------------------------------------------------
// Pool singleton — lazily created, reused across requests.
// Uses Neon's WebSocket transport so interactive transactions work.
// ---------------------------------------------------------------------------

const globalForPool = globalThis as unknown as {
  __neon_pool: Pool | undefined;
};

function getPool(): Pool {
  if (!globalForPool.__neon_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Copy .env.example → .env.local and fill it in.",
      );
    }
    globalForPool.__neon_pool = new Pool({ connectionString: url });
  }
  return globalForPool.__neon_pool;
}

/**
 * Run a callback inside an interactive Postgres transaction.
 *
 * Unlike the HTTP-based `db` client (which batches all statements into a
 * single request), this helper opens a real WebSocket connection to Neon
 * and lets you **read intermediate results** within the transaction.
 *
 * Use this when you need read-then-decide-then-write logic:
 *
 * ```ts
 * import { withTransaction } from "@/lib/db";
 *
 * const result = await withTransaction(async (tx) => {
 *   const [user] = await tx.select().from(participants).where(eq(participants.id, id));
 *   if (!user) throw new Error("Not found");
 *
 *   await tx.update(participants)
 *     .set({ active: false })
 *     .where(eq(participants.id, id));
 *
 *   return user;
 * });
 * ```
 *
 * The transaction is committed on success, rolled back on throw.
 */
export async function withTransaction<T>(
  fn: (tx: Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0]) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const poolDb = drizzle({ client: pool, schema });
  return poolDb.transaction(fn);
}
