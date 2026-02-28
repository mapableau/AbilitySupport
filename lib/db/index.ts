/**
 * lib/db — Database access layer (Neon Postgres + Drizzle ORM).
 *
 * Re-exports the Drizzle client and all table definitions so consumers
 * can write:
 *   import { db, participants, providers } from "@/lib/db";
 */

export * from "./client";
export * from "./schema";
