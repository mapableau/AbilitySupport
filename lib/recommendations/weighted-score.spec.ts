/**
 * Tests for the weighted scoring formula with dynamic context.
 *
 * score = base_match * 1.0
 *       + preference_alignment * 0.4
 *       + reliability * 0.3
 *       + urgency_bonus * 0.2
 *       + emotional_comfort_bonus * 0.1
 */

import {
  scoreOrgCandidate,
  SCORE_WEIGHTS,
  proximityFactor,
  capabilityFactor,
  reliabilityFactor,
  preferenceAlignmentFactor,
  urgencyBonusFactor,
  emotionalComfortFactor,
} from "./score";
import type { VerifiedOrgCandidate, VerifiedWorkerCandidate, DynamicRiskContext } from "./types";
import type { MatchSpec } from "../schemas/match-spec";
import type { OrganisationSearchDoc, WorkerSearchDoc } from "../search/indexer/types";

// ── Fixtures ───────────────────────────────────────────────────────────────

const ORG_DOC: OrganisationSearchDoc = {
  id: "org-1", entity_id: "org-1", entity_type: "organisation",
  name: "Test Org", abn: "", org_type: "care",
  service_types: ["personal_care"], service_area_tokens: [],
  location: [-33.87, 151.21], provides_care: true, provides_transport: false,
  wav_available: false, has_transfer_assist: false, has_manual_handling: false,
  total_vehicles: 0, vehicle_types: [], verified: true, active: true,
  worker_count: 3, reliability_score: 80, updated_at: 0,
};

const WORKER_DOC: WorkerSearchDoc = {
  id: "wrk-1", entity_id: "wrk-1", entity_type: "worker",
  name: "Jane", organisation_id: "org-1", organisation_name: "Test Org",
  worker_role: "support_worker",
  capabilities: ["personal_care", "driving", "positive_behaviour_support"],
  service_area_tokens: [], location: null,
  can_drive: true, provides_care: true, provides_transport: true,
  has_transfer_assist: false, has_manual_handling: false,
  has_wheelchair_transfer: false, has_medication_admin: false,
  has_positive_behaviour_support: true, has_aac: false,
  clearance_status: "cleared", clearance_current: true,
  organisation_verified: true, active: true, reliability_score: 90,
  updated_at: 0,
};

function makeVerified(overrides?: Partial<VerifiedOrgCandidate>): VerifiedOrgCandidate {
  return {
    source: "typesense", doc: ORG_DOC, textScore: 0, geoDistanceKm: 5,
    verification: { availabilityConfirmed: true, vehicleAvailable: null, clearanceCurrent: null, orgPoolAllowed: true, unknowns: [] },
    workers: [{
      source: "typesense", doc: WORKER_DOC, textScore: 0, geoDistanceKm: 5,
      verification: { availabilityConfirmed: true, vehicleAvailable: null, clearanceCurrent: true, orgPoolAllowed: true, unknowns: [] },
    }],
    ...overrides,
  };
}

const SPEC: MatchSpec = {
  participantProfileId: "pp-1", requestType: "care",
  serviceTypes: ["personal_care"], urgency: "standard", maxDistanceKm: 25,
};

const CTX: DynamicRiskContext = {
  emotionalState: "calm", needsUrgency: "routine",
  functionalNeeds: ["personal_care"], continuityWorker: false,
  previousPositiveExperience: false,
};

// ── Weight constants ───────────────────────────────────────────────────────

describe("SCORE_WEIGHTS", () => {
  it("has the correct formula weights", () => {
    expect(SCORE_WEIGHTS.baseMatch).toBe(1.0);
    expect(SCORE_WEIGHTS.preferenceAlignment).toBe(0.4);
    expect(SCORE_WEIGHTS.reliability).toBe(0.3);
    expect(SCORE_WEIGHTS.urgencyBonus).toBe(0.2);
    expect(SCORE_WEIGHTS.emotionalComfortBonus).toBe(0.1);
  });
});

// ── Individual factor tests ────────────────────────────────────────────────

describe("preferenceAlignmentFactor", () => {
  it("scores 1.0 when all functional needs are matched", () => {
    const f = preferenceAlignmentFactor(["personal_care", "driving"], ["personal_care"], false, false);
    expect(f.score).toBe(1);
  });

  it("scores lower when needs are not matched", () => {
    const f = preferenceAlignmentFactor(["driving"], ["personal_care", "wheelchair_transfer"], false, false);
    expect(f.score).toBe(0);
  });

  it("boosts score for sensory support match", () => {
    const f = preferenceAlignmentFactor(["sensory_support", "aac"], [], true, false);
    expect(f.score).toBe(1);
  });

  it("accounts for continuity worker", () => {
    const f = preferenceAlignmentFactor([], [], false, true);
    expect(f.score).toBe(1);
    expect(f.detail).toContain("continuity");
  });
});

describe("urgencyBonusFactor", () => {
  it("scores high for urgent + available", () => {
    const f = urgencyBonusFactor("urgent", "soon", true);
    expect(f.score).toBe(1);
  });

  it("scores low for urgent + unavailable", () => {
    const f = urgencyBonusFactor("urgent", "soon", false);
    expect(f.score).toBe(0.3);
  });

  it("scores medium for flexible timing", () => {
    const f = urgencyBonusFactor("low", "routine", true);
    expect(f.score).toBe(0.6);
  });
});

describe("emotionalComfortFactor", () => {
  it("scores high for stressed participant with positive history", () => {
    const f = emotionalComfortFactor("anxious", true, true, true);
    expect(f.score).toBeGreaterThan(0.8);
  });

  it("scores lower for stressed participant with no history", () => {
    const f = emotionalComfortFactor("anxious", false, false, false);
    expect(f.score).toBe(0.5);
  });

  it("scores well for calm participant with familiar provider", () => {
    const f = emotionalComfortFactor("calm", false, false, true);
    expect(f.score).toBeGreaterThan(0.8);
  });
});

describe("reliabilityFactor with outcome history", () => {
  it("boosts score with positive outcome history", () => {
    const noHistory = reliabilityFactor(80);
    const withHistory = reliabilityFactor(80, { completedBookings: 10, positiveRate: 0.9 });
    expect(withHistory.score).toBeGreaterThan(noHistory.score);
    expect(withHistory.detail).toContain("10 bookings");
  });

  it("caps at 1.0", () => {
    const f = reliabilityFactor(95, { completedBookings: 50, positiveRate: 1.0 });
    expect(f.score).toBeLessThanOrEqual(1);
  });
});

// ── Full scoring with breakdown ────────────────────────────────────────────

describe("scoreOrgCandidate with dynamic context", () => {
  it("returns scoreBreakdown with all 5 components", () => {
    const rec = scoreOrgCandidate(makeVerified(), SPEC, CTX);
    expect(rec.scoreBreakdown).toBeDefined();
    expect(rec.scoreBreakdown!.baseMatch).toBeGreaterThan(0);
    expect(rec.scoreBreakdown!.preferenceAlignment).toBeGreaterThan(0);
    expect(rec.scoreBreakdown!.reliability).toBeGreaterThan(0);
    expect(rec.scoreBreakdown!.urgencyBonus).toBeGreaterThan(0);
    expect(rec.scoreBreakdown!.emotionalComfortBonus).toBeGreaterThan(0);
  });

  it("includes formula weights in breakdown", () => {
    const rec = scoreOrgCandidate(makeVerified(), SPEC, CTX);
    expect(rec.scoreBreakdown!.weights).toEqual(SCORE_WEIGHTS);
  });

  it("score is between 0 and 100", () => {
    const rec = scoreOrgCandidate(makeVerified(), SPEC, CTX);
    expect(rec.score).toBeGreaterThanOrEqual(0);
    expect(rec.score).toBeLessThanOrEqual(100);
  });

  it("has 8 match factors (4 base + preference + reliability + urgency + emotional)", () => {
    const rec = scoreOrgCandidate(makeVerified(), SPEC, CTX);
    expect(rec.matchFactors).toHaveLength(8);
    const names = rec.matchFactors.map((f) => f.factor);
    expect(names).toContain("proximity");
    expect(names).toContain("capability_match");
    expect(names).toContain("availability");
    expect(names).toContain("verification_status");
    expect(names).toContain("preference_alignment");
    expect(names).toContain("reliability");
    expect(names).toContain("urgency_bonus");
    expect(names).toContain("emotional_comfort");
  });

  it("scores higher with positive outcome history", () => {
    const noHistory = scoreOrgCandidate(makeVerified(), SPEC, CTX);
    const withHistory = scoreOrgCandidate(makeVerified(), SPEC, {
      ...CTX,
      previousPositiveExperience: true,
      outcomeHistory: { completedBookings: 20, positiveRate: 0.95 },
    });
    expect(withHistory.score).toBeGreaterThan(noHistory.score);
  });

  it("scores higher for anxious participant with PBS-capable worker", () => {
    const calm = scoreOrgCandidate(makeVerified(), SPEC, CTX);
    const anxiousWithPBS = scoreOrgCandidate(makeVerified(), SPEC, {
      ...CTX,
      emotionalState: "anxious",
      previousPositiveExperience: true,
    });
    expect(anxiousWithPBS.score).not.toBe(calm.score);
  });

  it("boosts urgent requests with confirmed availability", () => {
    const routine = scoreOrgCandidate(makeVerified(), SPEC, CTX);
    const urgent = scoreOrgCandidate(makeVerified(), SPEC, {
      ...CTX,
      needsUrgency: "urgent",
    });
    expect(urgent.score).toBeGreaterThanOrEqual(routine.score);
  });
});
