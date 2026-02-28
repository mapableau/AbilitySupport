import { evaluatePolicy, type PolicyInput, type PolicyDecision } from "./policy";
import type { MatchSpec } from "../schemas/match-spec";

// ── Test helpers ───────────────────────────────────────────────────────────

const BASE_MATCH_SPEC: MatchSpec = {
  participantProfileId: "550e8400-e29b-41d4-a716-446655440000",
  requestType: "care",
  serviceTypes: ["personal_care"],
  urgency: "standard",
  maxDistanceKm: 25,
};

function makeInput(overrides: Partial<PolicyInput> = {}): PolicyInput {
  return {
    matchSpec: BASE_MATCH_SPEC,
    unknownCriticalFields: [],
    isRecurring: false,
    requiresWav: false,
    requiresTransferAssist: false,
    requiresManualHandling: false,
    distressSignal: false,
    ...overrides,
  };
}

function spec(overrides: Partial<MatchSpec> = {}): MatchSpec {
  return { ...BASE_MATCH_SPEC, ...overrides };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("evaluatePolicy", () => {
  // 1. Baseline — simple care request, everything known, no flags
  it("returns low tier for a simple, fully-specified care request", () => {
    const result = evaluatePolicy(makeInput());

    expect(result.riskTier).toBe("low");
    expect(result.autoConfirmAllowed).toBe(true);
    expect(result.requiresHumanReview).toBe(false);
    expect(result.requiresVerification).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  // 2. Distress signal → sensitive
  it("escalates to sensitive when distress signal is flagged", () => {
    const result = evaluatePolicy(makeInput({ distressSignal: true }));

    expect(result.riskTier).toBe("sensitive");
    expect(result.requiresHumanReview).toBe(true);
    expect(result.autoConfirmAllowed).toBe(false);
    expect(result.reasons).toContain("Distress signal flagged by coordinator");
  });

  // 3. Emergency urgency → sensitive
  it("escalates to sensitive for emergency urgency", () => {
    const result = evaluatePolicy(
      makeInput({ matchSpec: spec({ urgency: "emergency" }) }),
    );

    expect(result.riskTier).toBe("sensitive");
    expect(result.requiresHumanReview).toBe(true);
    expect(result.reasons).toContain("Emergency urgency level");
  });

  // 4. Unknown critical fields → high
  it("escalates to high when critical fields are unknown", () => {
    const result = evaluatePolicy(
      makeInput({
        unknownCriticalFields: ["participant_address", "ndis_number"],
      }),
    );

    expect(result.riskTier).toBe("high");
    expect(result.requiresHumanReview).toBe(true);
    expect(result.requiresVerification).toBe(true);
    expect(result.autoConfirmAllowed).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining("participant_address"),
        expect.stringContaining("ndis_number"),
      ]),
    );
  });

  // 5. Transfer assist → high
  it("escalates to high when transfer assistance is required", () => {
    const result = evaluatePolicy(
      makeInput({ requiresTransferAssist: true }),
    );

    expect(result.riskTier).toBe("high");
    expect(result.requiresHumanReview).toBe(true);
    expect(result.reasons).toContain(
      "Transfer assistance required — safety-critical capability",
    );
  });

  // 6. Manual handling → high
  it("escalates to high when manual handling is required", () => {
    const result = evaluatePolicy(
      makeInput({ requiresManualHandling: true }),
    );

    expect(result.riskTier).toBe("high");
    expect(result.requiresHumanReview).toBe(true);
    expect(result.reasons).toContain(
      "Manual handling required — safety-critical capability",
    );
  });

  // 7. Urgent + recurring → high
  it("escalates to high for urgent recurring requests", () => {
    const result = evaluatePolicy(
      makeInput({
        matchSpec: spec({ urgency: "urgent" }),
        isRecurring: true,
      }),
    );

    expect(result.riskTier).toBe("high");
    expect(result.reasons).toContain(
      "Urgent recurring request — unusual combination requires review",
    );
  });

  // 8. WAV with unknown availability → high
  it("escalates to high when WAV is required but availability is unknown", () => {
    const result = evaluatePolicy(
      makeInput({
        requiresWav: true,
        unknownCriticalFields: ["wav_availability"],
        matchSpec: spec({
          requirements: {
            wheelchairAccessible: true,
            requiredCapabilities: ["wheelchair_transfer"],
            specialQualifications: [],
            verifiedOrganisationsOnly: false,
          },
        }),
      }),
    );

    expect(result.riskTier).toBe("high");
    expect(result.reasons).toContain(
      "WAV required but vehicle availability is unknown",
    );
  });

  // 9. Recurring (non-urgent) → medium
  it("assigns medium tier for non-urgent recurring bookings", () => {
    const result = evaluatePolicy(makeInput({ isRecurring: true }));

    expect(result.riskTier).toBe("medium");
    expect(result.requiresHumanReview).toBe(false);
    expect(result.requiresVerification).toBe(true);
    expect(result.autoConfirmAllowed).toBe(false);
    expect(result.reasons).toContain(
      "Recurring booking bundle — needs schedule conflict check",
    );
  });

  // 10. WAV required (availability known) → medium
  it("assigns medium tier when WAV is required with known availability", () => {
    const result = evaluatePolicy(makeInput({ requiresWav: true }));

    expect(result.riskTier).toBe("medium");
    expect(result.reasons).toContain(
      "Wheelchair-accessible vehicle required",
    );
  });

  // 11. Combined care + transport → medium
  it("assigns medium tier for combined care + transport requests", () => {
    const result = evaluatePolicy(
      makeInput({ matchSpec: spec({ requestType: "both" }) }),
    );

    expect(result.riskTier).toBe("medium");
    expect(result.reasons).toContain(
      "Combined care + transport coordination",
    );
  });

  // 12. Therapy service → medium
  it("assigns medium tier when therapy service is requested", () => {
    const result = evaluatePolicy(
      makeInput({
        matchSpec: spec({ serviceTypes: ["therapy"] }),
      }),
    );

    expect(result.riskTier).toBe("medium");
    expect(result.reasons).toContain(
      "Therapy service — worker qualifications must be verified",
    );
  });

  // 13. Urgent non-recurring → medium
  it("assigns medium tier for urgent non-recurring requests", () => {
    const result = evaluatePolicy(
      makeInput({ matchSpec: spec({ urgency: "urgent" }) }),
    );

    expect(result.riskTier).toBe("medium");
    expect(result.reasons).toContain(
      "Urgent request — expedited matching required",
    );
  });

  // 14. Multiple medium triggers still produce medium
  it("stays at medium when multiple medium-tier rules fire", () => {
    const result = evaluatePolicy(
      makeInput({
        requiresWav: true,
        matchSpec: spec({ requestType: "both", serviceTypes: ["therapy"] }),
      }),
    );

    expect(result.riskTier).toBe("medium");
    expect(result.reasons).toHaveLength(3);
  });

  // 15. High overrides medium
  it("high tier overrides medium-tier triggers", () => {
    const result = evaluatePolicy(
      makeInput({
        requiresWav: true,
        requiresTransferAssist: true,
        isRecurring: true,
      }),
    );

    expect(result.riskTier).toBe("high");
    expect(result.requiresHumanReview).toBe(true);
    // medium reasons should still be collected
    expect(result.reasons).toContain(
      "Wheelchair-accessible vehicle required",
    );
    expect(result.reasons).toContain(
      "Transfer assistance required — safety-critical capability",
    );
  });

  // 16. Sensitive overrides everything
  it("sensitive tier overrides all lower tiers", () => {
    const result = evaluatePolicy(
      makeInput({
        distressSignal: true,
        requiresTransferAssist: true,
        requiresManualHandling: true,
        requiresWav: true,
        isRecurring: true,
        unknownCriticalFields: ["ndis_number"],
      }),
    );

    expect(result.riskTier).toBe("sensitive");
    expect(result.requiresHumanReview).toBe(true);
    expect(result.requiresVerification).toBe(true);
    expect(result.autoConfirmAllowed).toBe(false);
    // all reasons still collected
    expect(result.reasons.length).toBeGreaterThanOrEqual(5);
  });

  // 17. Low urgency with no flags → low
  it("returns low for a low-urgency request with no risk signals", () => {
    const result = evaluatePolicy(
      makeInput({ matchSpec: spec({ urgency: "low" }) }),
    );

    expect(result.riskTier).toBe("low");
    expect(result.autoConfirmAllowed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  // 18. Transport-only request → low (no special flags)
  it("returns low for a simple transport request", () => {
    const result = evaluatePolicy(
      makeInput({
        matchSpec: spec({
          requestType: "transport",
          serviceTypes: ["transport"],
        }),
      }),
    );

    expect(result.riskTier).toBe("low");
    expect(result.autoConfirmAllowed).toBe(true);
  });

  // 19. Reasons array is always populated for non-low tiers
  it("always provides at least one reason for non-low tiers", () => {
    const inputs: PolicyInput[] = [
      makeInput({ distressSignal: true }),
      makeInput({ requiresTransferAssist: true }),
      makeInput({ isRecurring: true }),
      makeInput({ requiresWav: true }),
    ];

    for (const input of inputs) {
      const result = evaluatePolicy(input);
      expect(result.reasons.length).toBeGreaterThan(0);
    }
  });

  // 20. Decision flags are consistent with tier
  it("produces decision flags consistent with the tier for all tiers", () => {
    const cases: Array<{ input: PolicyInput; expectedTier: string }> = [
      { input: makeInput(), expectedTier: "low" },
      { input: makeInput({ isRecurring: true }), expectedTier: "medium" },
      { input: makeInput({ requiresTransferAssist: true }), expectedTier: "high" },
      { input: makeInput({ distressSignal: true }), expectedTier: "sensitive" },
    ];

    for (const { input, expectedTier } of cases) {
      const result = evaluatePolicy(input);
      expect(result.riskTier).toBe(expectedTier);

      if (result.riskTier === "low") {
        expect(result.autoConfirmAllowed).toBe(true);
        expect(result.requiresHumanReview).toBe(false);
        expect(result.requiresVerification).toBe(false);
      } else if (result.riskTier === "medium") {
        expect(result.autoConfirmAllowed).toBe(false);
        expect(result.requiresHumanReview).toBe(false);
        expect(result.requiresVerification).toBe(true);
      } else {
        expect(result.autoConfirmAllowed).toBe(false);
        expect(result.requiresHumanReview).toBe(true);
        expect(result.requiresVerification).toBe(true);
      }
    }
  });
});
