/**
 * lib/db/client.ts — Neon Postgres connection via Drizzle ORM.
 *
 * Uses @neondatabase/serverless for edge-compatible pooling.
 * PostGIS and pgvector extensions are enabled at the DB level;
 * custom column helpers live in ./columns.ts when added.
 *
 * Environment:
 *   DATABASE_URL — Neon connection string (pooled, ?sslmode=require)
 *
 * Usage:
 *   import { db } from "@/lib/db";
 *   const rows = await db.select().from(providers);
 */

// TODO: uncomment once drizzle-orm and @neondatabase/serverless are installed
// import { neon } from "@neondatabase/serverless";
// import { drizzle } from "drizzle-orm/neon-http";
// import * as schema from "./schema";
//
// const sql = neon(process.env.DATABASE_URL!);
// export const db = drizzle(sql, { schema });

export {};
