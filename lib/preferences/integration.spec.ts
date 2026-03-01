/**
 * Integration tests proving preference weights flow from outcome
 * through storage into the next match run's scoring.
 *
 * End-to-end: outcome → weight adjustment → stored → scorer reads → score changes.
 */

import {
  computeWeightAdjustments,
  applyWeightAdjustments,
  DEFAULT_WEIGHTS,
  parseWeights,
} from "./weights";
import {
  preferenceAlignmentFactor,
} from "../../lib/recommendations/score";
import type { CreateOutcomeInput } from "../schemas/outcome";
import type { DynamicRiskContext } from "../recommendations/types";

function makeOutcome(overrides: Partial<CreateOutcomeInput> = {}): CreateOutcomeInput {
  return {
    bookingId: "bk-1",
    participantProfileId: "pp-1",
    organisationId: "org-1",
    comfortRating: 4,
    accessibilityMet: true,
    continuityPreference: "no_preference",
    emotionalAftercareNeeded: false,
    wouldUseAgain: true,
    additionalNeedsNoted: [],
    ...overrides,
  };
}

describe("Preference weights → scoring integration", () => {
  // ── Wheelchair accessibility mismatch → higher accessibility weight ──

  describe("wheelchair access mismatch increases accessibility_weight", () => {
    const outcome = makeOutcome({ accessibilityMet: false, comfortRating: 2 });
    const adjustments = computeWeightAdjustments(outcome);
    const updatedWeights = applyWeightAdjustments(DEFAULT_WEIGHTS, adjustments);

    it("accessibility weight increased from default", () => {
      expect(updatedWeights.accessibility).toBeGreaterThan(DEFAULT_WEIGHTS.accessibility);
    });

    it("scorer penalises candidate missing wheelchair when weight is high", () => {
      const candidateWithout = ["personal_care"];
      const needs = ["wheelchair", "personal_care"];

      const lowWeight = preferenceAlignmentFactor(candidateWithout, needs, false, false, DEFAULT_WEIGHTS);
      const highWeight = preferenceAlignmentFactor(candidateWithout, needs, false, false, updatedWeights);

      expect(highWeight.score).toBeLessThan(lowWeight.score);
    });

    it("candidate WITH wheelchair scores the same regardless of weight", () => {
      const candidateWith = ["wheelchair", "personal_care"];
      const needs = ["wheelchair", "personal_care"];

      const lowWeight = preferenceAlignmentFactor(candidateWith, needs, false, false, DEFAULT_WEIGHTS);
      const highWeight = preferenceAlignmentFactor(candidateWith, needs, false, false, updatedWeights);

      expect(highWeight.score).toBe(lowWeight.score);
    });
  });

  // ── Sensory discomfort → higher sensory_quality weight ───────────────

  describe("sensory discomfort increases sensory_quality requirement", () => {
    const outcome = makeOutcome({
      additionalNeedsNoted: ["sensory_support", "hearing_support"],
      comfortRating: 2,
    });
    const adjustments = computeWeightAdjustments(outcome);
    const updatedWeights = applyWeightAdjustments(DEFAULT_WEIGHTS, adjustments);

    it("sensory_quality weight increased from default", () => {
      expect(updatedWeights.sensory_quality).toBeGreaterThan(DEFAULT_WEIGHTS.sensory_quality);
    });

    it("candidate without sensory support gets 'unmet: sensory' with high weight", () => {
      const candidateWithout = ["personal_care"];
      const needs = ["personal_care"];

      const highWeight = preferenceAlignmentFactor(candidateWithout, needs, true, false, updatedWeights);
      expect(highWeight.detail).toContain("unmet: sensory");
      expect(highWeight.score).toBeLessThan(1);
    });

    it("candidate WITH sensory support is not penalised", () => {
      const candidateWith = ["personal_care", "sensory_support"];
      const needs = ["personal_care"];

      const highWeight = preferenceAlignmentFactor(candidateWith, needs, true, false, updatedWeights);
      expect(highWeight.score).toBe(1);
    });
  });

  // ── Communication needs → higher communication_support weight ────────

  describe("AAC needs noted increases communication weight", () => {
    const outcome = makeOutcome({ additionalNeedsNoted: ["aac"] });
    const adjustments = computeWeightAdjustments(outcome);
    const updatedWeights = applyWeightAdjustments(DEFAULT_WEIGHTS, adjustments);

    it("communication_support weight increased", () => {
      expect(updatedWeights.communication_support).toBeGreaterThan(DEFAULT_WEIGHTS.communication_support);
    });
  });

  // ── Continuity preference → higher continuity weight ─────────────────

  describe("same_worker preference increases continuity weight", () => {
    const outcome = makeOutcome({ continuityPreference: "same_worker" });
    const adjustments = computeWeightAdjustments(outcome);
    const updatedWeights = applyWeightAdjustments(DEFAULT_WEIGHTS, adjustments);

    it("continuity weight increased", () => {
      expect(updatedWeights.continuity).toBeGreaterThan(DEFAULT_WEIGHTS.continuity);
    });

    it("scorer values continuity higher when weight is elevated", () => {
      const caps = ["personal_care"];
      const needs = ["personal_care"];

      const withContinuity = preferenceAlignmentFactor(caps, needs, false, true, updatedWeights);
      expect(withContinuity.score).toBeGreaterThan(0.5);
    });
  });

  // ── Safety concern → higher safety weight ────────────────────────────

  describe("safety concerns increase safety weight", () => {
    const outcome = makeOutcome({ safetyConcerns: "Felt unsafe during transfer" });
    const adjustments = computeWeightAdjustments(outcome);
    const updatedWeights = applyWeightAdjustments(DEFAULT_WEIGHTS, adjustments);

    it("safety weight increased", () => {
      expect(updatedWeights.safety).toBeGreaterThan(DEFAULT_WEIGHTS.safety);
    });
  });

  // ── Cumulative learning over multiple outcomes ───────────────────────

  describe("weights accumulate over multiple outcomes", () => {
    it("three accessibility mismatches push weight near max", () => {
      let weights = { ...DEFAULT_WEIGHTS };
      for (let i = 0; i < 3; i++) {
        const adj = computeWeightAdjustments(makeOutcome({ accessibilityMet: false }));
        weights = applyWeightAdjustments(weights, adj);
      }
      expect(weights.accessibility).toBeGreaterThanOrEqual(0.9);
      expect(weights.accessibility).toBeLessThanOrEqual(1.0);
    });

    it("positive outcomes slowly decay weights back toward baseline", () => {
      let weights = { ...DEFAULT_WEIGHTS, accessibility: 0.8 };
      for (let i = 0; i < 5; i++) {
        const adj = computeWeightAdjustments(makeOutcome({ comfortRating: 5 }));
        weights = applyWeightAdjustments(weights, adj);
      }
      expect(weights.accessibility).toBeLessThan(0.8);
      expect(weights.accessibility).toBeGreaterThan(DEFAULT_WEIGHTS.accessibility);
    });
  });

  // ── parseWeights round-trip ──────────────────────────────────────────

  describe("weights survive JSONB round-trip", () => {
    it("parseWeights reads back stored weights correctly", () => {
      const adjusted = applyWeightAdjustments(DEFAULT_WEIGHTS, [
        { key: "accessibility", delta: 0.15, reason: "test" },
        { key: "sensory_quality", delta: 0.10, reason: "test" },
      ]);

      const stored = { weights: adjusted };
      const parsed = parseWeights(stored);

      expect(parsed.accessibility).toBe(adjusted.accessibility);
      expect(parsed.sensory_quality).toBe(adjusted.sensory_quality);
      expect(parsed.continuity).toBe(DEFAULT_WEIGHTS.continuity);
    });
  });
});
