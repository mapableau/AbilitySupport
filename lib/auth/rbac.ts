/**
 * lib/auth/rbac.ts — Role-based access control helpers.
 *
 * Pure functions for checking roles and building guards.
 * No DB calls — operates on the roles array from AuthContext.
 */

import type { UserRole } from "../schemas/enums.js";
import { USER_ROLES } from "../schemas/enums.js";
import type { AuthContext } from "./types.js";

/** The default role assigned to new users on first login. */
export const DEFAULT_ROLE: UserRole = "participant";

/** Roles that grant read access to the coordinator review queue. */
export const COORDINATOR_ROLES: readonly UserRole[] = ["admin", "coordinator"];

/** Roles that grant access to audit logs and compliance reports. */
export const AUDIT_ROLES: readonly UserRole[] = ["admin", "auditor"];

/** Roles that can manage an organisation's provider pool. */
export const PROVIDER_ADMIN_ROLES: readonly UserRole[] = ["admin", "provider_admin"];

/** Check if the user has at least one of the required roles. */
export function hasRole(auth: AuthContext, ...required: UserRole[]): boolean {
  return required.some((r) => auth.roles.includes(r));
}

/** Check if the user has ALL of the specified roles. */
export function hasAllRoles(auth: AuthContext, ...required: UserRole[]): boolean {
  return required.every((r) => auth.roles.includes(r));
}

/** Check if the user can access coordinator features. */
export function isCoordinator(auth: AuthContext): boolean {
  return hasRole(auth, ...COORDINATOR_ROLES);
}

/** Check if the user can access audit/compliance features. */
export function isAuditor(auth: AuthContext): boolean {
  return hasRole(auth, ...AUDIT_ROLES);
}

/** Check if the user can manage the given organisation's pool. */
export function isProviderAdminFor(
  auth: AuthContext,
  organisationId: string,
  orgRoles: Array<{ role: string; organisationId: string | null }>,
): boolean {
  if (auth.roles.includes("admin")) return true;
  return orgRoles.some(
    (r) =>
      r.role === "provider_admin" && r.organisationId === organisationId,
  );
}

/** Validate that a string is a known UserRole. */
export function isValidRole(role: string): role is UserRole {
  return (USER_ROLES as readonly string[]).includes(role);
}
