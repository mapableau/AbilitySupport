/**
 * lib/recommendations/reorder.ts — Fast re-ranking without full recompute.
 *
 * When context changes (urgency, emotional state, preferences), this module
 * recalculates only the context-sensitive scoring factors and re-ranks the
 * existing recommendations. The expensive steps (Typesense search, Postgres
 * verification) are skipped entirely.
 *
 * Factors recomputed:
 *   - urgency_bonus (from new urgency level)
 *   - emotional_comfort (from new emotional state)
 *   - preference_alignment (from updated functional needs)
 *
 * Factors preserved from original run:
 *   - proximity (distance doesn't change)
 *   - capability_match (org capabilities don't change)
 *   - availability (already verified)
 *   - verification_status (already checked)
 *   - reliability (base score doesn't change)
 */

import type { ScoredRecommendation, DynamicRiskContext, ScoreBreakdown } from "./types.js";
import type { MatchFactor } from "../schemas/recommendation.js";
import {
  SCORE_WEIGHTS,
  urgencyBonusFactor,
  emotionalComfortFactor,
  preferenceAlignmentFactor,
} from "./score.js";

export interface ReorderInput {
  recommendations: ScoredRecommendation[];
  updatedContext: DynamicRiskContext;
  matchUrgency: string;
}

export interface ReorderResult {
  recommendations: ScoredRecommendation[];
  reorderedAt: string;
  changesApplied: string[];
}

const TOTAL_WEIGHT =
  SCORE_WEIGHTS.baseMatch +
  SCORE_WEIGHTS.preferenceAlignment +
  SCORE_WEIGHTS.reliability +
  SCORE_WEIGHTS.urgencyBonus +
  SCORE_WEIGHTS.emotionalComfortBonus;

/**
 * Re-rank recommendations by recalculating context-sensitive factors only.
 * Returns a new array sorted by updated score with new ranks assigned.
 */
export function reorderRecommendations(input: ReorderInput): ReorderResult {
  const { recommendations, updatedContext, matchUrgency } = input;
  const changes: string[] = [];

  const rescored = recommendations.map((rec) => {
    const oldFactors = new Map(rec.matchFactors.map((f) => [f.factor, f]));

    const baseFactor = (name: string) => oldFactors.get(name)?.score ?? 0.5;
    const baseMatch = (
      baseFactor("proximity") +
      baseFactor("capability_match") +
      baseFactor("availability") +
      baseFactor("verification_status")
    ) / 4;

    const workerCanDrive = rec.matchedCapabilities?.includes("driving") ?? false;
    const hasPBS = rec.matchedCapabilities?.includes("positive_behaviour_support") ?? false;

    const newPrefFactor = preferenceAlignmentFactor(
      rec.matchedCapabilities ?? [],
      updatedContext.functionalNeeds,
      updatedContext.functionalNeeds.includes("sensory_support"),
      updatedContext.continuityWorker,
      updatedContext.preferenceWeights,
    );

    const relFactor = oldFactors.get("reliability") ?? { factor: "reliability", score: 0.5 };

    const newUrgFactor = urgencyBonusFactor(
      matchUrgency,
      updatedContext.needsUrgency,
      baseFactor("availability") > 0.5,
    );

    const newEmoFactor = emotionalComfortFactor(
      updatedContext.emotionalState,
      workerCanDrive,
      hasPBS,
      updatedContext.previousPositiveExperience,
    );

    const newScore = (
      baseMatch * SCORE_WEIGHTS.baseMatch +
      newPrefFactor.score * SCORE_WEIGHTS.preferenceAlignment +
      relFactor.score * SCORE_WEIGHTS.reliability +
      newUrgFactor.score * SCORE_WEIGHTS.urgencyBonus +
      newEmoFactor.score * SCORE_WEIGHTS.emotionalComfortBonus
    ) / TOTAL_WEIGHT * 100;

    const preserved = rec.matchFactors.filter(
      (f) => !["preference_alignment", "urgency_bonus", "emotional_comfort"].includes(f.factor),
    );

    const newFactors: MatchFactor[] = [...preserved, newPrefFactor, newUrgFactor, newEmoFactor];

    const newBreakdown: ScoreBreakdown = {
      baseMatch: round(baseMatch * 100),
      preferenceAlignment: round(newPrefFactor.score * 100),
      reliability: round(relFactor.score * 100),
      urgencyBonus: round(newUrgFactor.score * 100),
      emotionalComfortBonus: round(newEmoFactor.score * 100),
      weights: { ...SCORE_WEIGHTS },
    };

    return {
      ...rec,
      score: round(newScore),
      matchFactors: newFactors,
      scoreBreakdown: newBreakdown,
    };
  });

  const sorted = rescored
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const oldOrder = recommendations.map((r) => r.organisationId);
  const newOrder = sorted.map((r) => r.organisationId);
  const moved = oldOrder.filter((id, i) => newOrder[i] !== id);

  if (moved.length > 0) changes.push(`${moved.length} recommendations moved`);
  changes.push(`urgency=${updatedContext.needsUrgency}`);
  changes.push(`emotional=${updatedContext.emotionalState}`);

  return {
    recommendations: sorted,
    reorderedAt: new Date().toISOString(),
    changesApplied: changes,
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
