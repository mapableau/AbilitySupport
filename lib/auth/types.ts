/**
 * lib/auth/types.ts — Shared auth context types.
 *
 * Every role-specific auth helper resolves to one of these context shapes.
 * Route handlers destructure them without knowing about Clerk internals.
 */

import type { UserRole } from "../schemas/enums.js";

/** Base context returned by any authenticated request. */
export interface AuthContext {
  userId: string;
  clerkId: string;
  email: string;
  roles: UserRole[];
}

/** Extended context when the caller is scoped to an organisation. */
export interface OrgScopedAuthContext extends AuthContext {
  organisationId: string;
  orgRole: "provider_admin" | "worker";
}

/** Narrowed context for coordinator/admin routes. */
export interface CoordinatorAuthContext extends AuthContext {
  role: "coordinator" | "admin";
}
