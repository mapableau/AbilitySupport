/**
 * lib/auth/sync.ts — Clerk → DB user synchronisation.
 *
 * Called by the Clerk webhook handler (app/api/auth/webhook/route.ts)
 * on user.created and user.updated events. Creates or updates the
 * internal users row and assigns the default role on first login.
 *
 * Also provides lookupUserByClerkId for session resolution.
 */

import { DEFAULT_ROLE } from "./rbac.js";

/** Shape of the internal user row returned by sync/lookup functions. */
export interface UserRecord {
  id: string;
  clerkId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  active: boolean;
}

/** Shape of a role assignment row. */
export interface RoleRecord {
  id: string;
  role: string;
  organisationId: string | null;
}

/**
 * Find a user by their Clerk ID. Returns null if not synced yet.
 *
 * TODO: replace with real Drizzle query:
 *   const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
 */
export async function lookupUserByClerkId(
  clerkId: string,
): Promise<UserRecord | null> {
  console.log(`[auth/sync] lookupUserByClerkId(${clerkId}) — stub`);
  return null;
}

/**
 * Fetch all role assignments for a user.
 *
 * TODO: replace with real Drizzle query:
 *   await db.select().from(roles).where(eq(roles.userId, userId));
 */
export async function getUserRoles(
  userId: string,
): Promise<RoleRecord[]> {
  console.log(`[auth/sync] getUserRoles(${userId}) — stub`);
  return [];
}

/**
 * Create or update a user row from Clerk webhook data.
 * On create: also assigns the default role (participant).
 *
 * Returns the upserted user record.
 */
export async function syncUserFromClerk(params: {
  clerkId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}): Promise<{ user: UserRecord; created: boolean }> {
  // TODO: replace with real Drizzle upsert:
  //   const [existing] = await db.select().from(users).where(eq(users.clerkId, params.clerkId));
  //   if (existing) {
  //     await db.update(users).set({ email, fullName, avatarUrl, updatedAt: new Date() })
  //       .where(eq(users.id, existing.id));
  //     return { user: { ...existing, ...params }, created: false };
  //   }
  //   const [user] = await db.insert(users).values({ clerkId, email, fullName, avatarUrl }).returning();
  //   await db.insert(roles).values({ userId: user.id, role: DEFAULT_ROLE });
  //   await audit({ userId: user.id, action: "role_assigned", ... });
  //   return { user, created: true };

  console.log(`[auth/sync] syncUserFromClerk(${params.clerkId}) — stub`);

  const user: UserRecord = {
    id: crypto.randomUUID(),
    clerkId: params.clerkId,
    email: params.email,
    fullName: params.fullName,
    avatarUrl: params.avatarUrl ?? null,
    active: true,
  };

  return { user, created: true };
}

/**
 * Assign a role to a user. Idempotent — silently succeeds if already assigned.
 *
 * TODO: INSERT INTO roles (user_id, role, organisation_id)
 *   VALUES ($1, $2, $3) ON CONFLICT DO NOTHING
 */
export async function assignRole(
  userId: string,
  role: string,
  organisationId?: string,
): Promise<void> {
  console.log(`[auth/sync] assignRole(${userId}, ${role}, org=${organisationId ?? "global"}) — stub`);
}

/**
 * Remove a role from a user.
 *
 * TODO: DELETE FROM roles WHERE user_id = $1 AND role = $2
 *   AND (organisation_id = $3 OR ($3 IS NULL AND organisation_id IS NULL))
 */
export async function removeRole(
  userId: string,
  role: string,
  organisationId?: string,
): Promise<void> {
  console.log(`[auth/sync] removeRole(${userId}, ${role}, org=${organisationId ?? "global"}) — stub`);
}
