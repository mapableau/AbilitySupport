/**
 * lib/provider-pool/auth.ts — Auth helpers for provider pool routes.
 *
 * Extracts and verifies the provider admin's organisation context.
 * Stubbed until Clerk is wired up — in production this reads from
 * the Clerk session JWT and verifies the user has provider_admin role
 * for the target organisation.
 */

export interface ProviderAuthContext {
  userId: string;
  organisationId: string;
}

/**
 * Extract provider auth context from a request.
 * TODO: replace with real Clerk auth once wired up:
 *   const { userId } = auth();
 *   const org = await db.select().from(roles)
 *     .where(and(eq(roles.userId, userId), eq(roles.role, 'provider_admin')));
 */
export async function getProviderAuth(
  request: Request,
): Promise<ProviderAuthContext | null> {
  const orgId = request.headers.get("x-organisation-id");
  const userId = request.headers.get("x-user-id");

  if (!orgId || !userId) return null;

  return { userId, organisationId: orgId };
}

export function unauthorizedResponse(): Response {
  return Response.json(
    { error: "Unauthorized. Provide x-organisation-id and x-user-id headers." },
    { status: 401 },
  );
}
