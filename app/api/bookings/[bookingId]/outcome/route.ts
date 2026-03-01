/**
 * POST /api/bookings/[bookingId]/outcome — Submit post-service outcome.
 *
 * Captures structured feedback after a booking is completed:
 *   - comfort_rating (1–5)
 *   - accessibility_met (boolean)
 *   - continuity_preference (same_worker / same_org / no_preference / different_worker)
 *   - emotional_aftercare_needed (boolean)
 *   - what_went_well / what_could_improve / safety_concerns
 *   - additional_needs_noted (string array → updates needs profile)
 *
 * Side effects:
 *   1. Persists service_outcomes row linked to booking
 *   2. Adjusts reliability_score for org + worker
 *   3. Updates continuity preference on participant_preferences
 *   4. If additional needs noted → appends to needs_profiles
 *   5. Emits followup/response_received for escalation workflow
 */

import { createOutcomeSchema } from "../../../../../lib/schemas/outcome.js";
import {
  analyseOutcome,
  persistOutcome,
  adjustReliabilityScore,
  updateContinuityPreference,
  appendToNeedsProfile,
  applyAndSaveWeightAdjustments,
} from "../../../../../lib/followups/outcomes.js";
import {
  getAuthContext,
  unauthorizedResponse,
} from "../../../../../lib/auth/index.js";
import { audit } from "../../../../../lib/db/audit.js";
import { inngest } from "../../../../../lib/workflows/inngest/client.js";

interface RouteContext {
  params: Promise<{ bookingId: string }>;
}

export async function POST(request: Request, ctx: RouteContext): Promise<Response> {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorizedResponse();

  const { bookingId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createOutcomeSchema.safeParse({ ...(body as Record<string, unknown>), bookingId });
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const analysis = analyseOutcome(parsed.data);

  const outcome = await persistOutcome(parsed.data, auth.userId, analysis);

  if (analysis.reliabilityDelta !== 0) {
    await adjustReliabilityScore({
      organisationId: parsed.data.organisationId,
      workerId: parsed.data.workerId,
      delta: analysis.reliabilityDelta,
      reason: analysis.flags.join("; "),
    });
  }

  if (analysis.continuityChanged) {
    await updateContinuityPreference(
      parsed.data.participantProfileId,
      parsed.data.continuityPreference ?? "no_preference",
      parsed.data.workerId,
      parsed.data.organisationId,
    );
  }

  await applyAndSaveWeightAdjustments(
    parsed.data.participantProfileId,
    analysis.weightAdjustments,
  );

  let needsProfileId: string | null = null;
  if (analysis.needsProfileUpdate) {
    needsProfileId = await appendToNeedsProfile(
      parsed.data.participantProfileId,
      parsed.data.additionalNeedsNoted ?? [],
    );
  }

  await audit({
    userId: auth.userId,
    action: "create",
    entityType: "service_outcomes",
    entityId: outcome.id,
    summary: `Outcome for booking ${bookingId}: comfort=${parsed.data.comfortRating}/5, accessibility=${parsed.data.accessibilityMet ? "met" : "not met"}`,
    metadata: { sentiment: analysis.sentiment, reliabilityDelta: analysis.reliabilityDelta },
  });

  if (analysis.sentiment === "negative" || !parsed.data.accessibilityMet) {
    await inngest.send({
      name: "followup/response_received",
      data: {
        followupId: outcome.followupId ?? outcome.id,
        bookingId,
        sentiment: analysis.sentiment,
        hasAccessibilityMismatch: !parsed.data.accessibilityMet,
      },
    });
  }

  return Response.json({
    outcome: {
      id: outcome.id,
      bookingId,
      sentiment: analysis.sentiment,
      comfortRating: parsed.data.comfortRating,
      accessibilityMet: parsed.data.accessibilityMet,
      continuityPreference: parsed.data.continuityPreference,
      emotionalAftercareNeeded: parsed.data.emotionalAftercareNeeded,
    },
    analysis: {
      sentiment: analysis.sentiment,
      reliabilityDelta: analysis.reliabilityDelta,
      needsProfileUpdated: analysis.needsProfileUpdate,
      needsProfileId,
      continuityChanged: analysis.continuityChanged,
      aftercareRequired: analysis.aftercareRequired,
      weightAdjustments: analysis.weightAdjustments,
      flags: analysis.flags,
    },
  }, { status: 201 });
}
