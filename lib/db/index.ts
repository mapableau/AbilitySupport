/**
 * lib/db — Database access layer (Neon Postgres + Drizzle ORM).
 *
 * Three access patterns:
 *
 * ```ts
 * import { db, query, withTransaction, audit } from "@/lib/db";
 * import { users, roles, consents, auditLog } from "@/lib/db";
 *
 * // 1. Typed Drizzle queries (default — edge-compatible HTTP)
 * const rows = await db.select().from(users).where(eq(users.email, email));
 *
 * // 2. Raw SQL via tagged template (PostGIS, CTEs, EXPLAIN)
 * const geo = await query`SELECT ST_Distance(...) FROM ...`;
 *
 * // 3. Interactive transactions (WebSocket Pool — read-then-write)
 * await withTransaction(async (tx) => { ... });
 *
 * // 4. Audit logging (fire-and-forget)
 * await audit({ action: "read", entityType: "users", ... });
 * ```
 */

export { db, type Database } from "./client.js";
export { query } from "./query.js";
export { withTransaction } from "./tx.js";
export { audit, type AuditEntry } from "./audit.js";
export * from "./schema.js";
