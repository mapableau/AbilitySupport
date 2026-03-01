import {
  computeWeightAdjustments,
  applyWeightAdjustments,
  parseWeights,
  DEFAULT_WEIGHTS,
  PREFERENCE_WEIGHT_KEYS,
  type PreferenceWeights,
} from "./weights";
import type { CreateOutcomeInput } from "../schemas/outcome";

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

describe("DEFAULT_WEIGHTS", () => {
  it("has all 7 weight keys", () => {
    expect(Object.keys(DEFAULT_WEIGHTS).sort()).toEqual([...PREFERENCE_WEIGHT_KEYS].sort());
  });

  it("all defaults are between 0 and 1", () => {
    for (const val of Object.values(DEFAULT_WEIGHTS)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });
});

describe("computeWeightAdjustments", () => {
  it("returns empty for a perfect outcome with no special needs", () => {
    const adj = computeWeightAdjustments(makeOutcome({ comfortRating: 5 }));
    const positive = adj.filter((a) => a.delta > 0);
    expect(positive).toHaveLength(0);
  });

  it("returns accessibility decay for high-comfort accessible outcome", () => {
    const adj = computeWeightAdjustments(makeOutcome({ comfortRating: 4, accessibilityMet: true }));
    const accAdj = adj.find((a) => a.key === "accessibility");
    expect(accAdj).toBeDefined();
    expect(accAdj!.delta).toBe(-0.03);
  });

  it("increases accessibility weight when accessibility not met", () => {
    const adj = computeWeightAdjustments(makeOutcome({ accessibilityMet: false }));
    const accAdj = adj.find((a) => a.key === "accessibility" && a.delta > 0);
    expect(accAdj).toBeDefined();
    expect(accAdj!.delta).toBe(0.15);
  });

  it("increases sensory_quality for sensory needs", () => {
    const adj = computeWeightAdjustments(makeOutcome({
      additionalNeedsNoted: ["sensory_support", "hearing_support"],
    }));
    const sensory = adj.find((a) => a.key === "sensory_quality");
    expect(sensory).toBeDefined();
    expect(sensory!.delta).toBe(0.10);
    expect(sensory!.reason).toContain("sensory_support");
  });

  it("does not adjust sensory_quality for non-sensory needs", () => {
    const adj = computeWeightAdjustments(makeOutcome({
      additionalNeedsNoted: ["wheelchair", "personal_care"],
    }));
    const sensory = adj.find((a) => a.key === "sensory_quality");
    expect(sensory).toBeUndefined();
  });

  it("increases communication_support for AAC needs", () => {
    const adj = computeWeightAdjustments(makeOutcome({
      additionalNeedsNoted: ["aac"],
    }));
    const comm = adj.find((a) => a.key === "communication_support");
    expect(comm).toBeDefined();
    expect(comm!.delta).toBe(0.10);
  });

  it("increases continuity weight for same_worker preference", () => {
    const adj = computeWeightAdjustments(makeOutcome({ continuityPreference: "same_worker" }));
    const cont = adj.find((a) => a.key === "continuity");
    expect(cont).toBeDefined();
    expect(cont!.delta).toBe(0.10);
  });

  it("decreases continuity weight for different_worker preference", () => {
    const adj = computeWeightAdjustments(makeOutcome({ continuityPreference: "different_worker" }));
    const cont = adj.find((a) => a.key === "continuity");
    expect(cont).toBeDefined();
    expect(cont!.delta).toBe(-0.10);
  });

  it("increases emotional_comfort when aftercare needed", () => {
    const adj = computeWeightAdjustments(makeOutcome({ emotionalAftercareNeeded: true }));
    const emo = adj.find((a) => a.key === "emotional_comfort");
    expect(emo).toBeDefined();
    expect(emo!.delta).toBe(0.10);
  });

  it("increases safety weight on safety concerns", () => {
    const adj = computeWeightAdjustments(makeOutcome({ safetyConcerns: "Felt unsafe" }));
    const safety = adj.find((a) => a.key === "safety");
    expect(safety).toBeDefined();
    expect(safety!.delta).toBe(0.15);
  });

  it("stacks multiple adjustments from a bad outcome", () => {
    const adj = computeWeightAdjustments(makeOutcome({
      comfortRating: 1,
      accessibilityMet: false,
      emotionalAftercareNeeded: true,
      safetyConcerns: "Very unsafe",
      additionalNeedsNoted: ["sensory_support", "aac"],
      continuityPreference: "different_worker",
    }));
    expect(adj.length).toBeGreaterThanOrEqual(5);
    const keys = adj.map((a) => a.key);
    expect(keys).toContain("accessibility");
    expect(keys).toContain("sensory_quality");
    expect(keys).toContain("communication_support");
    expect(keys).toContain("emotional_comfort");
    expect(keys).toContain("safety");
    expect(keys).toContain("continuity");
  });
});

describe("applyWeightAdjustments", () => {
  it("adds positive delta", () => {
    const updated = applyWeightAdjustments(DEFAULT_WEIGHTS, [
      { key: "accessibility", delta: 0.15, reason: "test" },
    ]);
    expect(updated.accessibility).toBe(DEFAULT_WEIGHTS.accessibility + 0.15);
  });

  it("subtracts negative delta", () => {
    const updated = applyWeightAdjustments(DEFAULT_WEIGHTS, [
      { key: "continuity", delta: -0.10, reason: "test" },
    ]);
    expect(updated.continuity).toBe(DEFAULT_WEIGHTS.continuity - 0.10);
  });

  it("clamps to max 1.0", () => {
    const high: PreferenceWeights = { ...DEFAULT_WEIGHTS, safety: 0.95 };
    const updated = applyWeightAdjustments(high, [
      { key: "safety", delta: 0.15, reason: "test" },
    ]);
    expect(updated.safety).toBe(1.0);
  });

  it("clamps to min 0.0", () => {
    const low: PreferenceWeights = { ...DEFAULT_WEIGHTS, continuity: 0.05 };
    const updated = applyWeightAdjustments(low, [
      { key: "continuity", delta: -0.10, reason: "test" },
    ]);
    expect(updated.continuity).toBe(0.0);
  });

  it("applies multiple adjustments", () => {
    const updated = applyWeightAdjustments(DEFAULT_WEIGHTS, [
      { key: "accessibility", delta: 0.15, reason: "a" },
      { key: "sensory_quality", delta: 0.10, reason: "b" },
    ]);
    expect(updated.accessibility).toBeGreaterThan(DEFAULT_WEIGHTS.accessibility);
    expect(updated.sensory_quality).toBeGreaterThan(DEFAULT_WEIGHTS.sensory_quality);
    expect(updated.emotional_comfort).toBe(DEFAULT_WEIGHTS.emotional_comfort);
  });

  it("does not mutate the input object", () => {
    const original = { ...DEFAULT_WEIGHTS };
    applyWeightAdjustments(original, [
      { key: "safety", delta: 0.5, reason: "test" },
    ]);
    expect(original.safety).toBe(DEFAULT_WEIGHTS.safety);
  });
});

describe("parseWeights", () => {
  it("returns defaults for null input", () => {
    expect(parseWeights(null)).toEqual(DEFAULT_WEIGHTS);
  });

  it("returns defaults for empty object", () => {
    expect(parseWeights({})).toEqual(DEFAULT_WEIGHTS);
  });

  it("overrides specific keys from stored data", () => {
    const stored = { weights: { accessibility: 0.9, safety: 0.8 } };
    const parsed = parseWeights(stored);
    expect(parsed.accessibility).toBe(0.9);
    expect(parsed.safety).toBe(0.8);
    expect(parsed.sensory_quality).toBe(DEFAULT_WEIGHTS.sensory_quality);
  });

  it("clamps out-of-range values", () => {
    const stored = { weights: { accessibility: 1.5, safety: -0.3 } };
    const parsed = parseWeights(stored);
    expect(parsed.accessibility).toBe(1.0);
    expect(parsed.safety).toBe(0.0);
  });
});
