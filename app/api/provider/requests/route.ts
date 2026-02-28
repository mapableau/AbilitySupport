/**
 * GET /api/provider/requests — Incoming booking requests for the org.
 *
 * Returns bookings with status pending/confirmed routed to this organisation,
 * enriched with participant name and assigned worker name.
 */

import { listIncomingRequests } from "../../../../lib/provider-pool/data.js";
import {
  getProviderAuth,
  unauthorizedResponse,
} from "../../../../lib/provider-pool/auth.js";

export async function GET(request: Request): Promise<Response> {
  const auth = await getProviderAuth(request);
  if (!auth) return unauthorizedResponse();

  const requests = await listIncomingRequests(auth.organisationId);
  return Response.json({ requests });
}
