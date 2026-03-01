/**
 * lib/auth/session.ts — Clerk session helpers for Next.js App Router.
 *
 * Centralises all Clerk interaction into one file so:
 *   - Route handlers import getAuthContext(), not Clerk primitives
 *   - The Clerk → internal user mapping (clerk_id → users.id) lives here
 *   - Swapping Clerk for another provider touches only this file
 *
 * Stubbed until @clerk/nextjs is installed. Current implementation reads
 * x-user-id / x-organisation-id headers for local development.
 */

import type { AuthContext, OrgScopedAuthContext, CoordinatorAuthContext } from "./types.js";

// ── Stub header names (replaced by Clerk JWT claims in production) ────────

const USER_ID_HEADER = "x-user-id";
const ORG_ID_HEADER = "x-organisation-id";

/**
 * Resolve the authenticated user from the current request.
 * Returns null if the request is unauthenticated.
 *
 * Production implementation:
 *   const { userId: clerkId } = auth();
 *   const user = await db.select().from(users).where(eq(users.clerkId, clerkId));
 *   const roles = await db.select().from(roles).where(eq(roles.userId, user.id));
 */
export async function getAuthContext(
  request: Request,
): Promise<AuthContext | null> {
  const userId = request.headers.get(USER_ID_HEADER);
  if (!userId) return null;

  return {
    userId,
    clerkId: userId,
    email: "",
    roles: [],
  };
}

/**
 * Resolve org-scoped auth (provider admin or worker acting within an org).
 */
export async function getOrgScopedAuth(
  request: Request,
): Promise<OrgScopedAuthContext | null> {
  const base = await getAuthContext(request);
  if (!base) return null;

  const orgId = request.headers.get(ORG_ID_HEADER);
  if (!orgId) return null;

  return {
    ...base,
    organisationId: orgId,
    orgRole: "provider_admin",
  };
}

/**
 * Resolve coordinator or admin auth.
 */
export async function getCoordinatorAuth(
  request: Request,
): Promise<CoordinatorAuthContext | null> {
  const base = await getAuthContext(request);
  if (!base) return null;

  return {
    ...base,
    role: "coordinator",
  };
}

/** Standard 401 response for unauthenticated requests. */
export function unauthorizedResponse(message?: string): Response {
  return Response.json(
    { error: message ?? "Unauthorized" },
    { status: 401 },
  );
}

/** Standard 403 response for insufficient permissions. */
export function forbiddenResponse(message?: string): Response {
  return Response.json(
    { error: message ?? "Forbidden — insufficient permissions" },
    { status: 403 },
  );
}
