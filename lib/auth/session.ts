/**
 * lib/auth/session.ts — Session resolution for Next.js App Router routes.
 *
 * Resolves the authenticated user from the request, looks up their
 * internal DB record (clerk_id → users.id), and loads their roles.
 *
 * Three context shapes for different route protection levels:
 *   getAuthContext       → any authenticated user
 *   getOrgScopedAuth    → provider_admin or worker scoped to an org
 *   getCoordinatorAuth  → coordinator or admin
 *
 * Stub mode: reads x-user-id / x-organisation-id headers.
 * Production: reads Clerk JWT via auth() from @clerk/nextjs/server.
 */

import type { UserRole } from "../schemas/enums.js";
import type { AuthContext, OrgScopedAuthContext, CoordinatorAuthContext } from "./types.js";
import { lookupUserByClerkId, getUserRoles } from "./sync.js";
import { hasRole, COORDINATOR_ROLES, PROVIDER_ADMIN_ROLES } from "./rbac.js";

// ── Header names for stub auth (local dev without Clerk) ──────────────────

const CLERK_ID_HEADER = "x-clerk-id";
const USER_ID_HEADER = "x-user-id";
const ORG_ID_HEADER = "x-organisation-id";

/**
 * Extract the Clerk user ID from the request.
 *
 * Production: const { userId } = auth();
 * Stub: reads x-clerk-id or x-user-id header.
 */
function extractClerkId(request: Request): string | null {
  return (
    request.headers.get(CLERK_ID_HEADER) ??
    request.headers.get(USER_ID_HEADER) ??
    null
  );
}

/**
 * Resolve the full auth context: Clerk ID → DB user → roles.
 * Returns null if unauthenticated.
 */
export async function getAuthContext(
  request: Request,
): Promise<AuthContext | null> {
  const clerkId = extractClerkId(request);
  if (!clerkId) return null;

  const user = await lookupUserByClerkId(clerkId);

  if (user) {
    const roleRows = await getUserRoles(user.id);
    const roles = roleRows.map((r) => r.role as UserRole);

    return {
      userId: user.id,
      clerkId: user.clerkId,
      email: user.email,
      roles,
    };
  }

  return {
    userId: clerkId,
    clerkId,
    email: "",
    roles: [],
  };
}

/**
 * Resolve org-scoped auth. Returns null if:
 *   - Not authenticated
 *   - No organisation header
 *   - User doesn't have provider_admin or admin role
 */
export async function getOrgScopedAuth(
  request: Request,
): Promise<OrgScopedAuthContext | null> {
  const base = await getAuthContext(request);
  if (!base) return null;

  const orgId = request.headers.get(ORG_ID_HEADER);
  if (!orgId) return null;

  if (!hasRole(base, ...PROVIDER_ADMIN_ROLES)) return null;

  const orgRole = base.roles.includes("provider_admin")
    ? ("provider_admin" as const)
    : ("worker" as const);

  return { ...base, organisationId: orgId, orgRole };
}

/**
 * Resolve coordinator/admin auth. Returns null if the user doesn't
 * have coordinator or admin role.
 */
export async function getCoordinatorAuth(
  request: Request,
): Promise<CoordinatorAuthContext | null> {
  const base = await getAuthContext(request);
  if (!base) return null;

  if (!hasRole(base, ...COORDINATOR_ROLES)) return null;

  const role = base.roles.includes("admin")
    ? ("admin" as const)
    : ("coordinator" as const);

  return { ...base, role };
}

/**
 * Build a guard that checks for specific roles. Returns a 401/403
 * Response if the check fails, or null if the user passes.
 */
export async function requireRole(
  request: Request,
  ...requiredRoles: UserRole[]
): Promise<{ auth: AuthContext } | Response> {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorizedResponse();
  if (!hasRole(auth, ...requiredRoles)) {
    return forbiddenResponse(
      `Requires one of: ${requiredRoles.join(", ")}`,
    );
  }
  return { auth };
}

/** Standard 401 response. */
export function unauthorizedResponse(message?: string): Response {
  return Response.json(
    { error: message ?? "Unauthorized — sign in required" },
    { status: 401 },
  );
}

/** Standard 403 response. */
export function forbiddenResponse(message?: string): Response {
  return Response.json(
    { error: message ?? "Forbidden — insufficient permissions" },
    { status: 403 },
  );
}
