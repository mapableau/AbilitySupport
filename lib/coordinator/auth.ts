/**
 * lib/coordinator/auth.ts — Auth helpers for coordinator routes.
 *
 * Verifies the caller has the coordinator or admin role.
 * Stubbed until Clerk is wired up.
 */

import type { CoordinatorAuthContext } from "./types.js";

export async function getCoordinatorAuth(
  request: Request,
): Promise<CoordinatorAuthContext | null> {
  // TODO: replace with Clerk auth
  //   const { userId } = auth();
  //   verify user has role 'coordinator' or 'admin'
  const userId = request.headers.get("x-user-id");
  if (!userId) return null;
  return { userId };
}

export function unauthorizedResponse(): Response {
  return Response.json(
    { error: "Unauthorized. Coordinator or admin role required." },
    { status: 401 },
  );
}
