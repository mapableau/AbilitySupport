/**
 * lib/db/query.ts — Raw SQL query helper via Neon's HTTP transport.
 *
 * For cases where Drizzle's query builder doesn't support a feature
 * (e.g. PostGIS functions, raw CTEs, or EXPLAIN ANALYZE). Most code
 * should use the typed `db` client instead.
 *
 * The raw SQL function is a tagged template literal:
 *
 * ```ts
 * import { query } from "@/lib/db";
 *
 * const rows = await query`
 *   SELECT id, full_name
 *   FROM users
 *   WHERE email = ${email}
 * `;
 * ```
 *
 * Parameters are automatically escaped (SQL injection safe).
 */

import { neon } from "@neondatabase/serverless";

const globalForSql = globalThis as unknown as {
  __neon_sql: ReturnType<typeof neon> | undefined;
};

function getSql(): ReturnType<typeof neon> {
  if (!globalForSql.__neon_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Copy .env.example → .env.local and fill it in.",
      );
    }
    globalForSql.__neon_sql = neon(url);
  }
  return globalForSql.__neon_sql;
}

/**
 * Execute a raw SQL query using Neon's HTTP transport.
 *
 * Returns an array of row objects. Parameters in the tagged template
 * are automatically escaped.
 *
 * ```ts
 * const [user] = await query`SELECT * FROM users WHERE id = ${userId}`;
 * ```
 */
export async function query<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const sql = getSql();
  const result = await sql(strings, ...values);
  return result as T[];
}
