/**
 * lib/auth — Authentication spine.
 *
 * Centralised Clerk integration and role-based auth context resolution.
 * All route handlers import from here — never from Clerk directly.
 *
 * Usage:
 *   import { getAuthContext, getOrgScopedAuth, unauthorizedResponse } from "@/lib/auth";
 */

export * from "./types.js";
export {
  getAuthContext,
  getOrgScopedAuth,
  getCoordinatorAuth,
  unauthorizedResponse,
  forbiddenResponse,
} from "./session.js";
