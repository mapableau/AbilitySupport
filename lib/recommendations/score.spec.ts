import { scoreOrgCandidate, rankRecommendations } from "./score";
import type { VerifiedOrgCandidate, VerifiedWorkerCandidate } from "./types";
import type { MatchSpec } from "../schemas/match-spec";
import type { OrganisationSearchDoc, WorkerSearchDoc } from "../search/indexer/types";

const BASE_ORG_DOC: OrganisationSearchDoc = {
  id: "org-1",
  entity_id: "org-1",
  entity_type: "organisation",
  name: "Test Care Org",
  abn: "12345678901",
  org_type: "care",
  service_types: ["personal_care", "community_access"],
  service_area_tokens: ["parramatta", "NSW"],
  location: [-33.87, 151.21],
  provides_care: true,
  provides_transport: false,
  wav_available: false,
  has_transfer_assist: false,
  has_manual_handling: false,
  total_vehicles: 0,
  vehicle_types: [],
  verified: true,
  active: true,
  worker_count: 5,
  reliability_score: 80,
  updated_at: 1700000000,
};

const BASE_WORKER_DOC: WorkerSearchDoc = {
  id: "wrk-1",
  entity_id: "wrk-1",
  entity_type: "worker",
  name: "Jane Smith",
  organisation_id: "org-1",
  organisation_name: "Test Care Org",
  worker_role: "support_worker",
  capabilities: ["personal_care", "driving"],
  service_area_tokens: ["parramatta", "NSW"],
  location: [-33.87, 151.21],
  can_drive: true,
  provides_care: true,
  provides_transport: true,
  has_transfer_assist: false,
  has_manual_handling: false,
  has_wheelchair_transfer: false,
  has_medication_admin: false,
  has_positive_behaviour_support: false,
  has_aac: false,
  clearance_status: "cleared",
  clearance_current: true,
  organisation_verified: true,
  active: true,
  reliability_score: 90,
  updated_at: 1700000000,
};

const BASE_SPEC: MatchSpec = {
  participantProfileId: "550e8400-e29b-41d4-a716-446655440000",
  requestType: "care",
  serviceTypes: ["personal_care"],
  urgency: "standard",
  maxDistanceKm: 25,
  location: { lat: -33.87, lng: 151.21 },
};

function makeVerifiedWorker(
  overrides: Partial<VerifiedWorkerCandidate> = {},
): VerifiedWorkerCandidate {
  return {
    source: "typesense",
    doc: BASE_WORKER_DOC,
    textScore: 0,
    geoDistanceKm: 3.2,
    verification: {
      availabilityConfirmed: true,
      vehicleAvailable: null,
      clearanceCurrent: true,
      orgPoolAllowed: true,
      unknowns: [],
    },
    ...overrides,
  };
}

function makeVerifiedOrg(
  overrides: Partial<VerifiedOrgCandidate> = {},
): VerifiedOrgCandidate {
  return {
    source: "typesense",
    doc: BASE_ORG_DOC,
    textScore: 0,
    geoDistanceKm: 3.2,
    verification: {
      availabilityConfirmed: true,
      vehicleAvailable: null,
      clearanceCurrent: null,
      orgPoolAllowed: true,
      unknowns: [],
    },
    workers: [makeVerifiedWorker()],
    ...overrides,
  };
}

describe("scoreOrgCandidate", () => {
  it("produces a score between 0 and 100", () => {
    const rec = scoreOrgCandidate(makeVerifiedOrg(), BASE_SPEC);
    expect(rec.score).toBeGreaterThanOrEqual(0);
    expect(rec.score).toBeLessThanOrEqual(100);
  });

  it("assigns 'verified' confidence when all constraints pass", () => {
    const rec = scoreOrgCandidate(makeVerifiedOrg(), BASE_SPEC);
    expect(rec.confidence).toBe("verified");
  });

  it("assigns 'needs_verification' when unknowns exist", () => {
    const rec = scoreOrgCandidate(
      makeVerifiedOrg({
        verification: {
          availabilityConfirmed: false,
          vehicleAvailable: null,
          clearanceCurrent: null,
          orgPoolAllowed: true,
          unknowns: ["no_worker_availability_confirmed"],
        },
      }),
      BASE_SPEC,
    );
    expect(rec.confidence).toBe("needs_verification");
  });

  it("assigns 'likely' when org is unverified but constraints pass", () => {
    const rec = scoreOrgCandidate(
      makeVerifiedOrg({
        doc: { ...BASE_ORG_DOC, verified: false },
      }),
      BASE_SPEC,
    );
    expect(rec.confidence).toBe("likely");
  });

  it("includes proximity in match factors", () => {
    const rec = scoreOrgCandidate(makeVerifiedOrg(), BASE_SPEC);
    const proximityFactor = rec.matchFactors.find((f) => f.factor === "proximity");
    expect(proximityFactor).toBeDefined();
    expect(proximityFactor!.detail).toContain("3.2 km");
  });

  it("scores higher when closer", () => {
    const close = scoreOrgCandidate(
      makeVerifiedOrg({ geoDistanceKm: 2 }),
      BASE_SPEC,
    );
    const far = scoreOrgCandidate(
      makeVerifiedOrg({ geoDistanceKm: 20 }),
      BASE_SPEC,
    );
    expect(close.score).toBeGreaterThan(far.score);
  });

  it("populates matchedServiceTypes from intersection", () => {
    const rec = scoreOrgCandidate(makeVerifiedOrg(), BASE_SPEC);
    expect(rec.matchedServiceTypes).toContain("personal_care");
  });

  it("populates matchedCapabilities from intersection", () => {
    const spec = {
      ...BASE_SPEC,
      requirements: { requiredCapabilities: ["personal_care" as const, "driving" as const], wheelchairAccessible: false, specialQualifications: [] as string[], verifiedOrganisationsOnly: false },
    };
    const rec = scoreOrgCandidate(makeVerifiedOrg(), spec);
    expect(rec.matchedCapabilities).toContain("personal_care");
    expect(rec.matchedCapabilities).toContain("driving");
  });

  it("builds a human-readable reasoning string", () => {
    const rec = scoreOrgCandidate(makeVerifiedOrg(), BASE_SPEC);
    expect(rec.reasoning).toBeTruthy();
    expect(rec.reasoning.length).toBeGreaterThan(10);
  });

  it("includes the best worker info", () => {
    const rec = scoreOrgCandidate(makeVerifiedOrg(), BASE_SPEC);
    expect(rec.workerId).toBe("wrk-1");
    expect(rec.workerName).toBe("Jane Smith");
  });

  it("handles org with no workers", () => {
    const rec = scoreOrgCandidate(
      makeVerifiedOrg({ workers: [] }),
      BASE_SPEC,
    );
    expect(rec.workerId).toBeNull();
    expect(rec.workerName).toBeNull();
    expect(rec.score).toBeGreaterThanOrEqual(0);
  });
});

describe("rankRecommendations", () => {
  it("assigns ranks by descending score", () => {
    const recs = [
      scoreOrgCandidate(makeVerifiedOrg({ geoDistanceKm: 20 }), BASE_SPEC),
      scoreOrgCandidate(makeVerifiedOrg({ geoDistanceKm: 2 }), BASE_SPEC),
      scoreOrgCandidate(makeVerifiedOrg({ geoDistanceKm: 10 }), BASE_SPEC),
    ];
    const ranked = rankRecommendations(recs);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(3);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
    expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score);
  });

  it("handles empty array", () => {
    expect(rankRecommendations([])).toEqual([]);
  });

  it("handles single element", () => {
    const recs = [scoreOrgCandidate(makeVerifiedOrg(), BASE_SPEC)];
    const ranked = rankRecommendations(recs);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].rank).toBe(1);
  });
});
