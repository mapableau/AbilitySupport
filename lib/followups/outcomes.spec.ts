import { analyseOutcome, type OutcomeAnalysis } from "./outcomes";
import type { CreateOutcomeInput } from "../schemas/outcome";
import * as fs from "fs";
import * as path from "path";

function makeInput(overrides: Partial<CreateOutcomeInput> = {}): CreateOutcomeInput {
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

describe("analyseOutcome", () => {
  it("positive outcome: high rating, accessibility met, would use again", () => {
    const a = analyseOutcome(makeInput({ comfortRating: 5 }));
    expect(a.sentiment).toBe("positive");
    expect(a.reliabilityDelta).toBe(3);
    expect(a.flags).toHaveLength(0);
  });

  it("positive 4-star outcome gives +2 reliability", () => {
    const a = analyseOutcome(makeInput({ comfortRating: 4 }));
    expect(a.sentiment).toBe("positive");
    expect(a.reliabilityDelta).toBe(2);
  });

  it("neutral 3-star outcome gives no reliability change", () => {
    const a = analyseOutcome(makeInput({ comfortRating: 3 }));
    expect(a.sentiment).toBe("neutral");
    expect(a.reliabilityDelta).toBe(0);
  });

  it("negative outcome: low rating", () => {
    const a = analyseOutcome(makeInput({ comfortRating: 2 }));
    expect(a.sentiment).toBe("negative");
    expect(a.reliabilityDelta).toBe(-5);
    expect(a.flags).toContain("Low comfort rating (2/5)");
  });

  it("very negative outcome: rating 1", () => {
    const a = analyseOutcome(makeInput({ comfortRating: 1 }));
    expect(a.reliabilityDelta).toBe(-10);
  });

  it("accessibility not met: additional penalty", () => {
    const a = analyseOutcome(makeInput({ accessibilityMet: false }));
    expect(a.reliabilityDelta).toBeLessThan(0);
    expect(a.flags).toContain("Accessibility needs not met");
  });

  it("would not use again: additional penalty", () => {
    const a = analyseOutcome(makeInput({ wouldUseAgain: false }));
    expect(a.reliabilityDelta).toBeLessThan(0);
    expect(a.flags).toContain("Participant would not use this provider again");
  });

  it("safety concerns: large penalty", () => {
    const a = analyseOutcome(makeInput({ safetyConcerns: "Worker was unsafe during transfer" }));
    expect(a.reliabilityDelta).toBeLessThan(0);
    expect(a.flags).toContain("Safety concerns reported");
  });

  it("additional needs noted: flags needs profile update", () => {
    const a = analyseOutcome(makeInput({
      additionalNeedsNoted: ["sensory_support", "cognitive_support"],
    }));
    expect(a.needsProfileUpdate).toBe(true);
    expect(a.flags).toContain("2 additional needs noted");
  });

  it("no additional needs: no profile update", () => {
    const a = analyseOutcome(makeInput());
    expect(a.needsProfileUpdate).toBe(false);
  });

  it("continuity preference changed: flagged", () => {
    const a = analyseOutcome(makeInput({ continuityPreference: "same_worker" }));
    expect(a.continuityChanged).toBe(true);
    expect(a.flags).toContain("Continuity preference: same_worker");
  });

  it("continuity no_preference: not flagged", () => {
    const a = analyseOutcome(makeInput({ continuityPreference: "no_preference" }));
    expect(a.continuityChanged).toBe(false);
  });

  it("emotional aftercare requested: flagged", () => {
    const a = analyseOutcome(makeInput({ emotionalAftercareNeeded: true }));
    expect(a.aftercareRequired).toBe(true);
    expect(a.flags).toContain("Emotional aftercare requested");
  });

  it("cumulative penalties stack", () => {
    const a = analyseOutcome(makeInput({
      comfortRating: 1,
      accessibilityMet: false,
      wouldUseAgain: false,
      safetyConcerns: "Serious safety issue",
    }));
    expect(a.reliabilityDelta).toBeLessThanOrEqual(-20);
    expect(a.flags.length).toBeGreaterThanOrEqual(4);
  });

  it("different_worker preference is flagged", () => {
    const a = analyseOutcome(makeInput({ continuityPreference: "different_worker" }));
    expect(a.continuityChanged).toBe(true);
    expect(a.flags).toContain("Continuity preference: different_worker");
  });
});

describe("0008_service_outcomes.sql migration", () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "../../db/migrations/0008_service_outcomes.sql"),
    "utf-8",
  );

  it("creates service_outcomes table", () => {
    expect(sql).toContain("CREATE TABLE service_outcomes");
  });

  it("has comfort_rating CHECK 1-5", () => {
    expect(sql).toContain("comfort_rating");
    expect(sql).toContain("BETWEEN 1 AND 5");
  });

  it("has continuity_preference CHECK constraint", () => {
    expect(sql).toContain("'same_worker'");
    expect(sql).toContain("'same_org'");
    expect(sql).toContain("'no_preference'");
    expect(sql).toContain("'different_worker'");
  });

  it("has accessibility_met boolean", () => {
    expect(sql).toContain("accessibility_met");
  });

  it("has emotional_aftercare_needed boolean", () => {
    expect(sql).toContain("emotional_aftercare_needed");
  });

  it("has UNIQUE (booking_id) — one outcome per booking", () => {
    expect(sql).toContain("UNIQUE (booking_id)");
  });

  it("has RLS with participant, worker, org, and broad policies", () => {
    expect(sql).toContain("ALTER TABLE service_outcomes ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("CREATE POLICY outcomes_participant");
    expect(sql).toContain("CREATE POLICY outcomes_worker");
    expect(sql).toContain("CREATE POLICY outcomes_org");
    expect(sql).toContain("CREATE POLICY outcomes_broad");
  });
});
