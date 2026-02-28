/**
 * GET /api/coordinator/queue — Fetch the coordinator review queue.
 *
 * Returns all items needing coordinator attention:
 *   - coordination_requests with status = 'awaiting_review' (Human required)
 *   - recommendations with confidence = 'needs_verification' (Needs verification)
 *
 * Items are sorted by urgency (emergency first) then creation time.
 */

import { fetchQueue } from "../../../../lib/coordinator/data.js";
import {
  getCoordinatorAuth,
  unauthorizedResponse,
} from "../../../../lib/coordinator/auth.js";

export async function GET(request: Request): Promise<Response> {
  const auth = await getCoordinatorAuth(request);
  if (!auth) return unauthorizedResponse();

  const items = await fetchQueue();

  const humanReview = items.filter((i) => i.kind === "human_review");
  const needsVerification = items.filter((i) => i.kind === "needs_verification");

  return Response.json({
    queue: items,
    counts: {
      total: items.length,
      humanReview: humanReview.length,
      needsVerification: needsVerification.length,
    },
  });
}
