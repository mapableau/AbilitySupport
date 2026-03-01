/**
 * lib/coordinator/auth.ts — Re-exports coordinator auth from lib/auth.
 *
 * Kept for backwards compatibility with existing route imports.
 * New code should import from "@/lib/auth" directly.
 */

import {
  getCoordinatorAuth as _getCoordinatorAuth,
  unauthorizedResponse as _unauthorizedResponse,
} from "../auth/session.js";

export type { CoordinatorAuthContext } from "./types.js";

export const getCoordinatorAuth = _getCoordinatorAuth;

export function unauthorizedResponse(): Response {
  return _unauthorizedResponse("Unauthorized. Coordinator or admin role required.");
}
