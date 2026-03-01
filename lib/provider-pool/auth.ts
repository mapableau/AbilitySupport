/**
 * lib/provider-pool/auth.ts — Re-exports org-scoped auth from lib/auth.
 *
 * Kept for backwards compatibility with existing route imports.
 * New code should import from "@/lib/auth" directly.
 */

import {
  getOrgScopedAuth,
  unauthorizedResponse as _unauthorizedResponse,
} from "../auth/session.js";

export interface ProviderAuthContext {
  userId: string;
  organisationId: string;
}

export async function getProviderAuth(
  request: Request,
): Promise<ProviderAuthContext | null> {
  const auth = await getOrgScopedAuth(request);
  if (!auth) return null;
  return { userId: auth.userId, organisationId: auth.organisationId };
}

export function unauthorizedResponse(): Response {
  return _unauthorizedResponse("Unauthorized. Provider admin role required.");
}
