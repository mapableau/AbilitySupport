/**
 * POST /api/followups/[followupId]/respond — Submit a followup response.
 *
 * Body: { rating: 1-5, comment?, accessibilityMatch: bool, wouldUseAgain: bool, issues?: string[] }
 *
 * Flow:
 *   1. Validate input
 *   2. Analyse signals (negative detection, accessibility mismatch)
 *   3. Update followup status to resolved
 *   4. Emit followup/response_received event →
 *      Inngest workflow handles escalation + confidence adjustment
 */

import { followupResponseSchema } from "../../../../../lib/schemas/followup.js";
import { analyseFollowupResponse } from "../../../../../lib/followups/signals.js";
import {
  getFollowup,
  getBooking,
  updateFollowupStatus,
} from "../../../../../lib/followups/data.js";
import { inngest } from "../../../../../lib/workflows/inngest/client.js";

interface RouteContext {
  params: Promise<{ followupId: string }>;
}

export async function POST(request: Request, ctx: RouteContext): Promise<Response> {
  const { followupId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = followupResponseSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const followup = await getFollowup(followupId);
  if (!followup) {
    return Response.json({ error: "Followup not found" }, { status: 404 });
  }

  if (followup.status === "resolved") {
    return Response.json(
      { error: "Followup already resolved" },
      { status: 409 },
    );
  }

  const analysis = analyseFollowupResponse(parsed.data);

  const responseDetails = JSON.stringify({
    ...parsed.data,
    analysis: {
      sentiment: analysis.sentiment,
      isNegative: analysis.isNegative,
      hasAccessibilityMismatch: analysis.hasAccessibilityMismatch,
      requiresEscalation: analysis.requiresEscalation,
      escalationReasons: analysis.escalationReasons,
    },
  });

  await updateFollowupStatus(followupId, "resolved", responseDetails);

  await inngest.send({
    name: "followup/response_received",
    data: {
      followupId,
      bookingId: followup.bookingId,
      sentiment: analysis.sentiment,
      hasAccessibilityMismatch: analysis.hasAccessibilityMismatch,
    },
  });

  return Response.json({
    followupId,
    status: "resolved",
    analysis: {
      sentiment: analysis.sentiment,
      requiresEscalation: analysis.requiresEscalation,
      escalationReasons: analysis.escalationReasons,
    },
  });
}
