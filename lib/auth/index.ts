/**
 * lib/auth — Authentication spine.
 *
 * Centralised Clerk integration, session resolution, RBAC guards,
 * and user sync. All route handlers import from here — never from
 * Clerk directly.
 *
 * Usage:
 *   import {
 *     getAuthContext, getOrgScopedAuth, getCoordinatorAuth,
 *     requireRole, hasRole, unauthorizedResponse,
 *   } from "@/lib/auth";
 */

export * from "./types.js";
export {
  getAuthContext,
  getOrgScopedAuth,
  getCoordinatorAuth,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "./session.js";
export {
  hasRole,
  hasAllRoles,
  isCoordinator,
  isAuditor,
  isProviderAdminFor,
  isValidRole,
  DEFAULT_ROLE,
  COORDINATOR_ROLES,
  AUDIT_ROLES,
  PROVIDER_ADMIN_ROLES,
} from "./rbac.js";
export {
  syncUserFromClerk,
  lookupUserByClerkId,
  getUserRoles,
  assignRole,
  removeRole,
  type UserRecord,
  type RoleRecord,
} from "./sync.js";
