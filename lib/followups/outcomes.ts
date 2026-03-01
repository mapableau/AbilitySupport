/**
 * lib/followups/outcomes.ts — Post-service outcome processing.
 *
 * Pure functions for analysing outcomes + data access stubs for
 * persisting outcomes and propagating signals to:
 *   - reliability_score (org + worker)
 *   - dynamic needs profile (additional needs noted)
 *   - continuity preferences (participant_preferences)
 */

import type { CreateOutcomeInput, ServiceOutcome, ContinuityPreference } from "../schemas/outcome.js";
import type { Sentiment } from "./types.js";

// ── Outcome analysis (pure) ────────────────────────────────────────────────

export interface OutcomeAnalysis {
  sentiment: Sentiment;
  reliabilityDelta: number;
  needsProfileUpdate: boolean;
  continuityChanged: boolean;
  aftercareRequired: boolean;
  flags: string[];
}

export function analyseOutcome(input: CreateOutcomeInput): OutcomeAnalysis {
  const flags: string[] = [];

  const sentiment: Sentiment =
    input.comfortRating <= 2 ? "negative" :
    input.comfortRating <= 3 ? "neutral" : "positive";

  let reliabilityDelta = 0;
  if (sentiment === "positive" && input.wouldUseAgain) {
    reliabilityDelta = input.comfortRating >= 5 ? 3 : 2;
  } else if (sentiment === "negative") {
    reliabilityDelta = input.comfortRating === 1 ? -10 : -5;
    flags.push(`Low comfort rating (${input.comfortRating}/5)`);
  }

  if (!input.accessibilityMet) {
    reliabilityDelta -= 5;
    flags.push("Accessibility needs not met");
  }

  if (!input.wouldUseAgain) {
    reliabilityDelta -= 3;
    flags.push("Participant would not use this provider again");
  }

  if (input.safetyConcerns) {
    reliabilityDelta -= 8;
    flags.push("Safety concerns reported");
  }

  const needsProfileUpdate = input.additionalNeedsNoted.length > 0;
  if (needsProfileUpdate) {
    flags.push(`${input.additionalNeedsNoted.length} additional needs noted`);
  }

  const continuityChanged = input.continuityPreference !== "no_preference";
  if (continuityChanged) {
    flags.push(`Continuity preference: ${input.continuityPreference}`);
  }

  if (input.emotionalAftercareNeeded) {
    flags.push("Emotional aftercare requested");
  }

  return {
    sentiment,
    reliabilityDelta,
    needsProfileUpdate,
    continuityChanged,
    aftercareRequired: input.emotionalAftercareNeeded,
    flags,
  };
}

// ── Data access (stubbed) ──────────────────────────────────────────────────

export async function persistOutcome(
  input: CreateOutcomeInput,
  submittedBy: string,
  analysis: OutcomeAnalysis,
): Promise<ServiceOutcome> {
  // TODO: INSERT INTO service_outcomes (...) VALUES (...) RETURNING *
  console.log(`[outcomes] persistOutcome(booking=${input.bookingId}) — stub`);
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    bookingId: input.bookingId,
    participantProfileId: input.participantProfileId,
    organisationId: input.organisationId,
    workerId: input.workerId ?? null,
    submittedBy,
    comfortRating: input.comfortRating,
    accessibilityMet: input.accessibilityMet,
    continuityPreference: input.continuityPreference ?? "no_preference",
    emotionalAftercareNeeded: input.emotionalAftercareNeeded ?? false,
    whatWentWell: input.whatWentWell ?? null,
    whatCouldImprove: input.whatCouldImprove ?? null,
    safetyConcerns: input.safetyConcerns ?? null,
    additionalNeedsNoted: input.additionalNeedsNoted ?? [],
    wouldUseAgain: input.wouldUseAgain ?? true,
    sentiment: analysis.sentiment,
    followupId: null,
    needsProfileId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function adjustReliabilityScore(params: {
  organisationId: string;
  workerId?: string;
  delta: number;
  reason: string;
}): Promise<void> {
  // TODO: UPDATE organisations SET reliability_score = GREATEST(0, LEAST(100, reliability_score + $delta))
  //   WHERE id = $1
  // If workerId: also adjust worker-level score
  console.log(
    `[outcomes] adjustReliabilityScore(org=${params.organisationId}, ` +
    `worker=${params.workerId ?? "n/a"}, delta=${params.delta > 0 ? "+" : ""}${params.delta}) — stub`,
  );
}

export async function updateContinuityPreference(
  participantProfileId: string,
  preference: ContinuityPreference,
  workerId?: string,
  organisationId?: string,
): Promise<void> {
  // TODO: UPDATE participant_preferences SET service_preferences = jsonb_set(...)
  //   WHERE participant_profile_id = $1
  console.log(
    `[outcomes] updateContinuityPreference(${participantProfileId}, ${preference}) — stub`,
  );
}

export async function appendToNeedsProfile(
  participantProfileId: string,
  additionalNeeds: string[],
): Promise<string> {
  // TODO: INSERT INTO needs_profiles (participant_id, functional_needs, ...)
  console.log(
    `[outcomes] appendToNeedsProfile(${participantProfileId}, ${additionalNeeds.join(",")}) — stub`,
  );
  return crypto.randomUUID();
}
