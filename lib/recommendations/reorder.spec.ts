import { reorderRecommendations, type ReorderInput } from "./reorder";
import type { ScoredRecommendation, DynamicRiskContext } from "./types";

function makeRec(
  orgId: string,
  score: number,
  extras: Partial<ScoredRecommendation> = {},
): ScoredRecommendation {
  return {
    organisationId: orgId,
    organisationName: `Org ${orgId}`,
    workerId: null,
    workerName: null,
    vehicleId: null,
    rank: 0,
    score,
    confidence: "verified",
    matchFactors: [
      { factor: "proximity", score: 0.8, detail: "5 km" },
      { factor: "capability_match", score: 0.9 },
      { factor: "availability", score: 1.0, detail: "Confirmed" },
      { factor: "verification_status", score: 1.0 },
      { factor: "preference_alignment", score: 0.7 },
      { factor: "reliability", score: 0.8 },
      { factor: "urgency_bonus", score: 0.5 },
      { factor: "emotional_comfort", score: 0.5 },
    ],
    scoreBreakdown: {
      baseMatch: 80, preferenceAlignment: 70, reliability: 80,
      urgencyBonus: 50, emotionalComfortBonus: 50,
      weights: { baseMatch: 1, preferenceAlignment: 0.4, reliability: 0.3, urgencyBonus: 0.2, emotionalComfortBonus: 0.1 },
    },
    matchedServiceTypes: ["personal_care"],
    matchedCapabilities: ["personal_care", "driving"],
    distanceKm: 5,
    reasoning: "Good match",
    unknowns: [],
    evidenceRefs: [],
    ...extras,
  };
}

const CALM_ROUTINE: DynamicRiskContext = {
  emotionalState: "calm",
  needsUrgency: "routine",
  functionalNeeds: ["personal_care"],
  continuityWorker: false,
  previousPositiveExperience: false,
};

function makeInput(overrides: Partial<ReorderInput> = {}): ReorderInput {
  return {
    recommendations: [
      makeRec("A", 80),
      makeRec("B", 75),
      makeRec("C", 70),
    ],
    updatedContext: CALM_ROUTINE,
    matchUrgency: "standard",
    ...overrides,
  };
}

describe("reorderRecommendations", () => {
  it("returns same number of recommendations", () => {
    const result = reorderRecommendations(makeInput());
    expect(result.recommendations).toHaveLength(3);
  });

  it("assigns sequential ranks starting from 1", () => {
    const result = reorderRecommendations(makeInput());
    expect(result.recommendations[0].rank).toBe(1);
    expect(result.recommendations[1].rank).toBe(2);
    expect(result.recommendations[2].rank).toBe(3);
  });

  it("preserves descending score order", () => {
    const result = reorderRecommendations(makeInput());
    for (let i = 1; i < result.recommendations.length; i++) {
      expect(result.recommendations[i - 1].score).toBeGreaterThanOrEqual(result.recommendations[i].score);
    }
  });

  it("includes reorderedAt timestamp", () => {
    const result = reorderRecommendations(makeInput());
    expect(result.reorderedAt).toBeTruthy();
    expect(new Date(result.reorderedAt).getTime()).toBeGreaterThan(0);
  });

  it("includes changesApplied with urgency and emotional state", () => {
    const result = reorderRecommendations(makeInput());
    expect(result.changesApplied.some((c) => c.includes("routine"))).toBe(true);
    expect(result.changesApplied.some((c) => c.includes("calm"))).toBe(true);
  });

  it("recalculates urgency_bonus factor", () => {
    const calm = reorderRecommendations(makeInput());
    const urgent = reorderRecommendations(makeInput({
      updatedContext: { ...CALM_ROUTINE, needsUrgency: "urgent" },
      matchUrgency: "urgent",
    }));

    const calmUrg = calm.recommendations[0].matchFactors.find((f) => f.factor === "urgency_bonus");
    const urgentUrg = urgent.recommendations[0].matchFactors.find((f) => f.factor === "urgency_bonus");

    expect(urgentUrg!.score).toBeGreaterThan(calmUrg!.score);
  });

  it("recalculates emotional_comfort factor", () => {
    const calm = reorderRecommendations(makeInput());
    const anxious = reorderRecommendations(makeInput({
      updatedContext: {
        ...CALM_ROUTINE,
        emotionalState: "anxious",
        previousPositiveExperience: true,
      },
    }));

    const calmEmo = calm.recommendations[0].matchFactors.find((f) => f.factor === "emotional_comfort");
    const anxEmo = anxious.recommendations[0].matchFactors.find((f) => f.factor === "emotional_comfort");

    expect(anxEmo!.score).toBeGreaterThan(calmEmo!.score);
  });

  it("recalculates preference_alignment factor", () => {
    const noPrefs = reorderRecommendations(makeInput({
      updatedContext: { ...CALM_ROUTINE, functionalNeeds: [] },
    }));
    const withPrefs = reorderRecommendations(makeInput({
      updatedContext: { ...CALM_ROUTINE, functionalNeeds: ["personal_care", "driving"] },
    }));

    const noPrefScore = noPrefs.recommendations[0].scoreBreakdown!.preferenceAlignment;
    const withPrefScore = withPrefs.recommendations[0].scoreBreakdown!.preferenceAlignment;

    expect(withPrefScore).toBeGreaterThan(noPrefScore);
  });

  it("preserves base factors (proximity, capability, availability, verification)", () => {
    const result = reorderRecommendations(makeInput());
    const rec = result.recommendations[0];
    const proximity = rec.matchFactors.find((f) => f.factor === "proximity");
    const capability = rec.matchFactors.find((f) => f.factor === "capability_match");

    expect(proximity!.score).toBe(0.8);
    expect(capability!.score).toBe(0.9);
  });

  it("can change the ranking order when urgency shifts", () => {
    const recA = makeRec("A", 80, {
      matchFactors: [
        { factor: "proximity", score: 0.9 },
        { factor: "capability_match", score: 0.9 },
        { factor: "availability", score: 0.3, detail: "Not confirmed" },
        { factor: "verification_status", score: 1.0 },
        { factor: "preference_alignment", score: 0.7 },
        { factor: "reliability", score: 0.9 },
        { factor: "urgency_bonus", score: 0.5 },
        { factor: "emotional_comfort", score: 0.5 },
      ],
    });
    const recB = makeRec("B", 75, {
      matchFactors: [
        { factor: "proximity", score: 0.7 },
        { factor: "capability_match", score: 0.8 },
        { factor: "availability", score: 1.0, detail: "Confirmed" },
        { factor: "verification_status", score: 1.0 },
        { factor: "preference_alignment", score: 0.7 },
        { factor: "reliability", score: 0.7 },
        { factor: "urgency_bonus", score: 0.5 },
        { factor: "emotional_comfort", score: 0.5 },
      ],
    });

    const urgentResult = reorderRecommendations({
      recommendations: [recA, recB],
      updatedContext: { ...CALM_ROUTINE, needsUrgency: "urgent" },
      matchUrgency: "urgent",
    });

    const first = urgentResult.recommendations[0];
    expect(first.organisationId).toBe("B");
  });

  it("updates scoreBreakdown with new values", () => {
    const result = reorderRecommendations(makeInput({
      updatedContext: { ...CALM_ROUTINE, needsUrgency: "urgent" },
      matchUrgency: "urgent",
    }));

    const breakdown = result.recommendations[0].scoreBreakdown!;
    expect(breakdown.urgencyBonus).toBeGreaterThan(50);
    expect(breakdown.weights).toBeDefined();
  });

  it("handles single recommendation", () => {
    const result = reorderRecommendations({
      recommendations: [makeRec("A", 80)],
      updatedContext: CALM_ROUTINE,
      matchUrgency: "standard",
    });
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].rank).toBe(1);
  });
});
