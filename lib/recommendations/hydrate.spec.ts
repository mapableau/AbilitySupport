import { hydrateCard, hydrateCards } from "./hydrate";
import type { ScoredRecommendation, VerifiedOrgCandidate, VerifiedWorkerCandidate } from "./types";
import type { OrganisationSearchDoc, WorkerSearchDoc } from "../search/indexer/types";

const ORG_DOC: OrganisationSearchDoc = {
  id: "org-1",
  entity_id: "org-1",
  entity_type: "organisation",
  name: "Acme Care",
  abn: "12345678901",
  org_type: "both",
  service_types: ["personal_care", "transport"],
  service_area_tokens: ["parramatta", "NSW", "2150"],
  location: [-33.87, 151.21],
  provides_care: true,
  provides_transport: true,
  wav_available: true,
  has_transfer_assist: false,
  has_manual_handling: true,
  total_vehicles: 3,
  vehicle_types: ["sedan", "wheelchair_accessible"],
  verified: true,
  active: true,
  worker_count: 8,
  reliability_score: 85,
  updated_at: 1700000000,
};

const WORKER_DOC: WorkerSearchDoc = {
  id: "wrk-1",
  entity_id: "wrk-1",
  entity_type: "worker",
  name: "Jane Smith",
  organisation_id: "org-1",
  organisation_name: "Acme Care",
  worker_role: "support_worker",
  capabilities: ["personal_care", "driving"],
  service_area_tokens: ["parramatta"],
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

function makeVerifiedWorker(): VerifiedWorkerCandidate {
  return {
    source: "typesense",
    doc: WORKER_DOC,
    textScore: 0,
    geoDistanceKm: 3.2,
    verification: {
      availabilityConfirmed: true,
      vehicleAvailable: null,
      clearanceCurrent: true,
      orgPoolAllowed: true,
      unknowns: [],
    },
  };
}

function makeVerifiedOrg(): VerifiedOrgCandidate {
  return {
    source: "typesense",
    doc: ORG_DOC,
    textScore: 0,
    geoDistanceKm: 3.2,
    verification: {
      availabilityConfirmed: true,
      vehicleAvailable: true,
      clearanceCurrent: null,
      orgPoolAllowed: true,
      unknowns: [],
    },
    workers: [makeVerifiedWorker()],
  };
}

function makeScored(): ScoredRecommendation {
  return {
    organisationId: "org-1",
    organisationName: "Acme Care",
    workerId: "wrk-1",
    workerName: "Jane Smith",
    vehicleId: null,
    rank: 1,
    score: 87.5,
    confidence: "verified",
    matchFactors: [
      { factor: "proximity", score: 0.95, detail: "3.2 km away" },
    ],
    matchedServiceTypes: ["personal_care"],
    matchedCapabilities: ["personal_care", "driving"],
    distanceKm: 3.2,
    reasoning: "Close, capable, verified.",
    unknowns: [],
    evidenceRefs: [],
  };
}

function makeVerifiedMap(): Map<string, VerifiedOrgCandidate> {
  return new Map([["org-1", makeVerifiedOrg()]]);
}

function makeEvidenceMap(): Map<string, { total: number; verified: number }> {
  return new Map([
    ["organisation:org-1", { total: 3, verified: 2 }],
    ["worker:wrk-1", { total: 1, verified: 1 }],
  ]);
}

describe("hydrateCard", () => {
  it("produces a RecommendationCard with organisation sub-object", () => {
    const card = hydrateCard(makeScored(), makeVerifiedMap(), makeEvidenceMap());
    expect(card.organisation.id).toBe("org-1");
    expect(card.organisation.name).toBe("Acme Care");
    expect(card.organisation.orgType).toBe("both");
    expect(card.organisation.serviceTypes).toEqual(["personal_care", "transport"]);
    expect(card.organisation.serviceAreaTokens).toEqual(["parramatta", "NSW", "2150"]);
    expect(card.organisation.location).toEqual({ lat: -33.87, lng: 151.21 });
    expect(card.organisation.verified).toBe(true);
    expect(card.organisation.workerCount).toBe(8);
    expect(card.organisation.reliabilityScore).toBe(85);
    expect(card.organisation.wavAvailable).toBe(true);
    expect(card.organisation.totalVehicles).toBe(3);
  });

  it("produces a worker sub-object when workerId is present", () => {
    const card = hydrateCard(makeScored(), makeVerifiedMap(), makeEvidenceMap());
    expect(card.worker).not.toBeNull();
    expect(card.worker!.id).toBe("wrk-1");
    expect(card.worker!.name).toBe("Jane Smith");
    expect(card.worker!.workerRole).toBe("support_worker");
    expect(card.worker!.capabilities).toEqual(["personal_care", "driving"]);
    expect(card.worker!.canDrive).toBe(true);
    expect(card.worker!.clearanceCurrent).toBe(true);
  });

  it("sets worker to null when workerId is absent", () => {
    const rec = { ...makeScored(), workerId: null, workerName: null };
    const card = hydrateCard(rec, makeVerifiedMap(), makeEvidenceMap());
    expect(card.worker).toBeNull();
  });

  it("merges evidence counts from both org and worker", () => {
    const card = hydrateCard(makeScored(), makeVerifiedMap(), makeEvidenceMap());
    expect(card.verification.evidenceCounts.total).toBe(4);
    expect(card.verification.evidenceCounts.verified).toBe(3);
  });

  it("handles missing evidence counts gracefully", () => {
    const card = hydrateCard(makeScored(), makeVerifiedMap(), new Map());
    expect(card.verification.evidenceCounts.total).toBe(0);
    expect(card.verification.evidenceCounts.verified).toBe(0);
  });

  it("carries verification fields from pipeline", () => {
    const card = hydrateCard(makeScored(), makeVerifiedMap(), makeEvidenceMap());
    expect(card.verification.availabilityConfirmed).toBe(true);
    expect(card.verification.vehicleAvailable).toBe(true);
    expect(card.verification.orgPoolAllowed).toBe(true);
    expect(card.verification.unknowns).toEqual([]);
  });

  it("sets correct confidence colour", () => {
    const verified = hydrateCard(
      { ...makeScored(), confidence: "verified" },
      makeVerifiedMap(), makeEvidenceMap(),
    );
    expect(verified.confidenceColor).toBe("green");

    const likely = hydrateCard(
      { ...makeScored(), confidence: "likely" },
      makeVerifiedMap(), makeEvidenceMap(),
    );
    expect(likely.confidenceColor).toBe("amber");

    const needsVerif = hydrateCard(
      { ...makeScored(), confidence: "needs_verification" },
      makeVerifiedMap(), makeEvidenceMap(),
    );
    expect(needsVerif.confidenceColor).toBe("red");
  });

  it("builds a label from org and worker names", () => {
    const card = hydrateCard(makeScored(), makeVerifiedMap(), makeEvidenceMap());
    expect(card.label).toBe("Acme Care – Jane Smith");
  });

  it("builds label without worker when worker is null", () => {
    const rec = { ...makeScored(), workerId: null, workerName: null };
    const card = hydrateCard(rec, makeVerifiedMap(), makeEvidenceMap());
    expect(card.label).toBe("Acme Care");
  });

  it("preserves all ScoredRecommendation fields", () => {
    const rec = makeScored();
    const card = hydrateCard(rec, makeVerifiedMap(), makeEvidenceMap());
    expect(card.rank).toBe(rec.rank);
    expect(card.score).toBe(rec.score);
    expect(card.confidence).toBe(rec.confidence);
    expect(card.matchFactors).toEqual(rec.matchFactors);
    expect(card.matchedServiceTypes).toEqual(rec.matchedServiceTypes);
    expect(card.matchedCapabilities).toEqual(rec.matchedCapabilities);
    expect(card.distanceKm).toBe(rec.distanceKm);
    expect(card.reasoning).toBe(rec.reasoning);
  });

  it("gracefully handles missing org in verified map", () => {
    const card = hydrateCard(makeScored(), new Map(), new Map());
    expect(card.organisation.name).toBe("Acme Care");
    expect(card.organisation.serviceTypes).toEqual([]);
    expect(card.organisation.verified).toBe(false);
    expect(card.worker).toBeNull();
  });
});

describe("hydrateCards", () => {
  it("hydrates an array preserving order", () => {
    const recs = [
      { ...makeScored(), rank: 1 },
      { ...makeScored(), rank: 2, organisationName: "Beta Care" },
    ];
    const cards = hydrateCards(recs, makeVerifiedMap(), makeEvidenceMap());
    expect(cards).toHaveLength(2);
    expect(cards[0].rank).toBe(1);
    expect(cards[1].rank).toBe(2);
  });

  it("handles empty array", () => {
    const cards = hydrateCards([], makeVerifiedMap(), makeEvidenceMap());
    expect(cards).toEqual([]);
  });
});
