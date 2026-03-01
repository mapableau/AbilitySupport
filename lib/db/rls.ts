/**
 * lib/db/rls.ts — RLS context setter for Postgres session variables.
 *
 * Before executing queries that touch RLS-protected tables, call
 * withRlsContext() to set the session variables that RLS policies read.
 * This runs inside a transaction so the variables are scoped to that
 * request and automatically cleared when the connection returns to the pool.
 *
 * Usage:
 *   import { withRlsContext } from "@/lib/db";
 *
 *   const rows = await withRlsContext(
 *     { userId: auth.userId, role: "coordinator" },
 *     async (tx) => tx.select().from(participant_profiles),
 *   );
 */

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import * as schema from "./schema.js";

const globalForPool = globalThis as unknown as {
  __neon_rls_pool: Pool | undefined;
};

function getPool(): Pool {
  if (!globalForPool.__neon_rls_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set.");
    }
    globalForPool.__neon_rls_pool = new Pool({ connectionString: url });
  }
  return globalForPool.__neon_rls_pool;
}

export interface RlsContext {
  userId: string;
  role: string;
  orgId?: string;
}

type TxHandle = Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

/**
 * Execute a callback inside a transaction with RLS session variables set.
 *
 * The variables are set via SET LOCAL (transaction-scoped) so they are
 * automatically cleared when the transaction ends.
 */
export async function withRlsContext<T>(
  ctx: RlsContext,
  fn: (tx: TxHandle) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const poolDb = drizzle({ client: pool, schema });

  return poolDb.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_rls_context(${ctx.userId}::uuid, ${ctx.role}, ${ctx.orgId ?? null}::uuid)`,
    );
    return fn(tx);
  });
}

/**
 * Determine which RLS context to use based on an auth context.
 * Maps the app-layer AuthContext into the three session variables
 * that Postgres RLS policies read.
 */
export function buildRlsContext(auth: {
  userId: string;
  roles: string[];
  organisationId?: string;
}): RlsContext {
  const rolePriority = ["admin", "auditor", "coordinator", "provider_admin", "worker", "participant"];
  const role = rolePriority.find((r) => auth.roles.includes(r)) ?? "participant";

  return {
    userId: auth.userId,
    role,
    orgId: auth.organisationId,
  };
}
