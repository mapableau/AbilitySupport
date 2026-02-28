/**
 * lib/db — Database access layer (Neon Postgres + Drizzle ORM).
 *
 * ```ts
 * import { db, withTransaction, participants, providers } from "@/lib/db";
 *
 * // Simple query (HTTP, edge-compatible)
 * const rows = await db.select().from(providers);
 *
 * // Interactive transaction (WebSocket, read-then-write)
 * await withTransaction(async (tx) => { ... });
 * ```
 */

export { db, type Database } from "./client.js";
export { withTransaction } from "./tx.js";
export * from "./schema.js";
