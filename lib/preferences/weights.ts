/**
 * lib/preferences/weights.ts — Preference weight engine.
 *
 * Pure functions that analyse service outcomes and compute adjustments
 * to participant preference weights. These weights are stored in the
 * participant_preferences.service_preferences JSONB and read by the
 * recommendation scorer on the next match run.
 *
 * Weight range: 0.0 (don't care) → 1.0 (critical requirement).
 * Adjustments are additive and clamped to [0, 1].
 *
 * The engine learns from negative signals — a mismatch on a dimension
 * increases the weight for that dimension in future matching.
 */

import type { CreateOutcomeInput } from "../schemas/outcome.js";

// ── Weight keys ────────────────────────────────────────────────────────────

export const PREFERENCE_WEIGHT_KEYS = [
  "accessibility",
  "sensory_quality",
  "communication_support",
  "continuity",
  "emotional_comfort",
  "punctuality",
  "safety",
] as const;
export type PreferenceWeightKey = (typeof PREFERENCE_WEIGHT_KEYS)[number];

export type PreferenceWeights = Record<PreferenceWeightKey, number>;

/** Default starting weights before any outcome history. */
export const DEFAULT_WEIGHTS: PreferenceWeights = {
  accessibility: 0.5,
  sensory_quality: 0.3,
  communication_support: 0.3,
  continuity: 0.3,
  emotional_comfort: 0.3,
  punctuality: 0.4,
  safety: 0.5,
};

// ── Adjustment calculation (pure) ──────────────────────────────────────────

export interface WeightAdjustment {
  key: PreferenceWeightKey;
  delta: number;
  reason: string;
}

/**
 * Compute preference weight adjustments from a service outcome.
 *
 * Rules:
 *   - Accessibility not met → increase accessibility weight (+0.15)
 *   - Sensory-related needs noted → increase sensory_quality weight (+0.10)
 *   - Communication needs noted → increase communication_support (+0.10)
 *   - Continuity preference expressed → increase continuity (+0.10)
 *   - Emotional aftercare needed → increase emotional_comfort (+0.10)
 *   - Safety concerns → increase safety weight (+0.15)
 *   - Low comfort + accessibility met → small decrease to accessibility (-0.05)
 *     (discomfort was from something else, not accessibility)
 *   - High comfort → modest decrease toward defaults (decay toward baseline)
 */
export function computeWeightAdjustments(
  outcome: CreateOutcomeInput,
): WeightAdjustment[] {
  const adjustments: WeightAdjustment[] = [];

  if (!outcome.accessibilityMet) {
    adjustments.push({
      key: "accessibility",
      delta: 0.15,
      reason: "Accessibility needs were not met",
    });
  }

  const sensoryNeeds = (outcome.additionalNeedsNoted ?? []).filter((n) =>
    ["sensory_support", "hearing_support", "vision_support"].includes(n),
  );
  if (sensoryNeeds.length > 0) {
    adjustments.push({
      key: "sensory_quality",
      delta: 0.10,
      reason: `Sensory needs noted: ${sensoryNeeds.join(", ")}`,
    });
  }

  const commNeeds = (outcome.additionalNeedsNoted ?? []).filter((n) =>
    ["aac", "communication_support"].includes(n),
  );
  if (commNeeds.length > 0) {
    adjustments.push({
      key: "communication_support",
      delta: 0.10,
      reason: `Communication support needs noted: ${commNeeds.join(", ")}`,
    });
  }

  if (
    outcome.continuityPreference === "same_worker" ||
    outcome.continuityPreference === "same_org"
  ) {
    adjustments.push({
      key: "continuity",
      delta: 0.10,
      reason: `Participant prefers ${outcome.continuityPreference.replace("_", " ")}`,
    });
  } else if (outcome.continuityPreference === "different_worker") {
    adjustments.push({
      key: "continuity",
      delta: -0.10,
      reason: "Participant requested a different worker",
    });
  }

  if (outcome.emotionalAftercareNeeded) {
    adjustments.push({
      key: "emotional_comfort",
      delta: 0.10,
      reason: "Emotional aftercare was needed",
    });
  }

  if (outcome.safetyConcerns) {
    adjustments.push({
      key: "safety",
      delta: 0.15,
      reason: "Safety concerns were reported",
    });
  }

  if (outcome.comfortRating >= 4 && outcome.accessibilityMet && outcome.wouldUseAgain) {
    adjustments.push({
      key: "accessibility",
      delta: -0.03,
      reason: "Positive outcome — accessibility weight decays toward baseline",
    });
  }

  return adjustments;
}

/**
 * Apply weight adjustments to current weights, clamping each to [0, 1].
 */
export function applyWeightAdjustments(
  current: PreferenceWeights,
  adjustments: WeightAdjustment[],
): PreferenceWeights {
  const updated = { ...current };
  for (const adj of adjustments) {
    updated[adj.key] = clamp(updated[adj.key] + adj.delta, 0, 1);
  }
  return updated;
}

/**
 * Parse preference weights from the service_preferences JSONB field.
 * Falls back to DEFAULT_WEIGHTS for any missing keys.
 */
export function parseWeights(
  servicePreferences: Record<string, unknown> | null | undefined,
): PreferenceWeights {
  const raw = (servicePreferences ?? {}) as Record<string, unknown>;
  const weightsRaw = (raw.weights ?? {}) as Record<string, unknown>;
  const result = { ...DEFAULT_WEIGHTS };
  for (const key of PREFERENCE_WEIGHT_KEYS) {
    if (typeof weightsRaw[key] === "number") {
      result[key] = clamp(weightsRaw[key] as number, 0, 1);
    }
  }
  return result;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
