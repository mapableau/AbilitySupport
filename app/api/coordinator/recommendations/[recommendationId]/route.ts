/**
 * POST /api/coordinator/recommendations/[recommendationId]
 *
 * Coordinator actions on a recommendation:
 *   approve              — accept this recommendation
 *   reject               — reject (coordinator will pick another)
 *   request_verification — create a verification follow-up
 *   add_notes            — append coordinator notes
 *
 * Body: { action, notes?, verificationSummary? }
 */

import { z } from "zod";
import {
  approveRecommendation,
  rejectRecommendation,
  createVerificationFollowup,
} from "../../../../../lib/coordinator/data.js";
import {
  getCoordinatorAuth,
  unauthorizedResponse,
} from "../../../../../lib/coordinator/auth.js";

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "request_verification", "add_notes"]),
  notes: z.string().max(5000).optional(),
  verificationSummary: z.string().max(2000).optional(),
});

interface RouteContext {
  params: Promise<{ recommendationId: string }>;
}

export async function POST(request: Request, ctx: RouteContext): Promise<Response> {
  const auth = await getCoordinatorAuth(request);
  if (!auth) return unauthorizedResponse();

  const { recommendationId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { action, notes, verificationSummary } = parsed.data;

  switch (action) {
    case "approve": {
      const ok = await approveRecommendation(recommendationId, auth.userId, notes);
      if (!ok) return Response.json({ error: "Not found or not pending" }, { status: 404 });
      return Response.json({ success: true, action: "approved", recommendationId });
    }

    case "reject": {
      const ok = await rejectRecommendation(recommendationId, auth.userId, notes);
      if (!ok) return Response.json({ error: "Not found or not pending" }, { status: 404 });
      return Response.json({ success: true, action: "rejected", recommendationId });
    }

    case "request_verification": {
      const summary = verificationSummary ?? "Coordinator requested verification";
      const result = await createVerificationFollowup(
        recommendationId,
        auth.userId,
        summary,
        notes,
      );
      return Response.json({
        success: true,
        action: "verification_requested",
        recommendationId,
        followupId: result.followupId,
      }, { status: 201 });
    }

    case "add_notes": {
      if (!notes) {
        return Response.json({ error: "Notes are required" }, { status: 400 });
      }
      return Response.json({ success: true, action: "notes_added", recommendationId });
    }

    default:
      return Response.json({ error: "Unknown action" }, { status: 400 });
  }
}
