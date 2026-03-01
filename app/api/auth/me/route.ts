/**
 * GET /api/auth/me — Current user profile with roles and consent scopes.
 *
 * Returns the authenticated user's profile, assigned roles, and
 * active consent scopes. Used by the client to render role-specific
 * UI and check consent status.
 */

import {
  getAuthContext,
  unauthorizedResponse,
  getUserRoles,
} from "../../../../lib/auth/index.js";

export async function GET(request: Request): Promise<Response> {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorizedResponse();

  const roleRecords = await getUserRoles(auth.userId);

  // TODO: fetch active consents for participant users
  // const consents = await db.select().from(consents)
  //   .where(and(
  //     eq(consents.participantProfileId, profileId),
  //     isNull(consents.revokedAt),
  //     or(isNull(consents.expiresAt), gt(consents.expiresAt, new Date())),
  //   ));

  return Response.json({
    user: {
      id: auth.userId,
      clerkId: auth.clerkId,
      email: auth.email,
      roles: auth.roles,
    },
    roleDetails: roleRecords.map((r) => ({
      role: r.role,
      organisationId: r.organisationId,
    })),
    consentScopes: [],
  });
}
