import { analyseFollowupResponse } from "./signals";
import type { FollowupResponseInput } from "./types";

function makeInput(overrides: Partial<FollowupResponseInput> = {}): FollowupResponseInput {
  return {
    rating: 4,
    accessibilityMatch: true,
    wouldUseAgain: true,
    ...overrides,
  };
}

describe("analyseFollowupResponse", () => {
  // ── Sentiment classification ─────────────────────────────────────────

  it("classifies rating 5 as positive", () => {
    const result = analyseFollowupResponse(makeInput({ rating: 5 }));
    expect(result.sentiment).toBe("positive");
    expect(result.isNegative).toBe(false);
  });

  it("classifies rating 4 as positive", () => {
    const result = analyseFollowupResponse(makeInput({ rating: 4 }));
    expect(result.sentiment).toBe("positive");
  });

  it("classifies rating 3 as neutral", () => {
    const result = analyseFollowupResponse(makeInput({ rating: 3 }));
    expect(result.sentiment).toBe("neutral");
    expect(result.isNegative).toBe(false);
  });

  it("classifies rating 2 as negative", () => {
    const result = analyseFollowupResponse(makeInput({ rating: 2 }));
    expect(result.sentiment).toBe("negative");
    expect(result.isNegative).toBe(true);
  });

  it("classifies rating 1 as negative", () => {
    const result = analyseFollowupResponse(makeInput({ rating: 1 }));
    expect(result.sentiment).toBe("negative");
    expect(result.isNegative).toBe(true);
  });

  // ── Escalation triggers ──────────────────────────────────────────────

  it("does not escalate a positive experience", () => {
    const result = analyseFollowupResponse(makeInput());
    expect(result.requiresEscalation).toBe(false);
    expect(result.escalationReasons).toHaveLength(0);
  });

  it("escalates on low rating", () => {
    const result = analyseFollowupResponse(makeInput({ rating: 1 }));
    expect(result.requiresEscalation).toBe(true);
    expect(result.escalationReasons).toContain("Low rating (1/5)");
  });

  it("escalates on accessibility mismatch regardless of rating", () => {
    const result = analyseFollowupResponse(makeInput({
      rating: 5,
      accessibilityMatch: false,
    }));
    expect(result.requiresEscalation).toBe(true);
    expect(result.hasAccessibilityMismatch).toBe(true);
    expect(result.escalationReasons).toContain(
      "Accessibility mismatch reported by participant",
    );
  });

  it("escalates when participant would not use provider again with rating ≤ 3", () => {
    const result = analyseFollowupResponse(makeInput({
      rating: 3,
      wouldUseAgain: false,
    }));
    expect(result.requiresEscalation).toBe(true);
    expect(result.escalationReasons).toContain(
      "Participant would not use this provider again",
    );
  });

  it("does not escalate wouldUseAgain=false with high rating", () => {
    const result = analyseFollowupResponse(makeInput({
      rating: 4,
      wouldUseAgain: false,
    }));
    expect(result.requiresEscalation).toBe(false);
  });

  it("escalates on safety keywords in comment", () => {
    const result = analyseFollowupResponse(makeInput({
      comment: "I felt unsafe during the transfer",
    }));
    expect(result.requiresEscalation).toBe(true);
    expect(result.escalationReasons).toContain(
      "Safety-related keywords detected in feedback",
    );
  });

  it("escalates on safety keywords in issues array", () => {
    const result = analyseFollowupResponse(makeInput({
      issues: ["Worker caused minor injury during transfer"],
    }));
    expect(result.requiresEscalation).toBe(true);
    expect(result.escalationReasons.some((r) => r.includes("Safety concern"))).toBe(true);
  });

  it("does not trigger safety escalation for normal comments", () => {
    const result = analyseFollowupResponse(makeInput({
      comment: "Service was fine, arrived on time",
    }));
    expect(result.requiresEscalation).toBe(false);
  });

  // ── Combined signals ─────────────────────────────────────────────────

  it("collects multiple escalation reasons", () => {
    const result = analyseFollowupResponse(makeInput({
      rating: 1,
      accessibilityMatch: false,
      wouldUseAgain: false,
      comment: "Felt unsafe, worker was negligent",
    }));
    expect(result.requiresEscalation).toBe(true);
    expect(result.escalationReasons.length).toBeGreaterThanOrEqual(3);
    expect(result.sentiment).toBe("negative");
    expect(result.hasAccessibilityMismatch).toBe(true);
  });

  it("handles empty issues array", () => {
    const result = analyseFollowupResponse(makeInput({ issues: [] }));
    expect(result.requiresEscalation).toBe(false);
  });

  it("handles missing optional fields", () => {
    const result = analyseFollowupResponse({
      rating: 4,
      accessibilityMatch: true,
      wouldUseAgain: true,
    });
    expect(result.sentiment).toBe("positive");
    expect(result.requiresEscalation).toBe(false);
  });
});
