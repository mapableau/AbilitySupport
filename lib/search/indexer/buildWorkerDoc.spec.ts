import { buildWorkerDoc, type BuildWorkerDocInput } from "./buildWorkerDoc";
import type { WorkerRowWithCapabilities } from "./types";

const BASE_ROW: WorkerRowWithCapabilities = {
  id: "wrk-001",
  user_id: "usr-001",
  organisation_id: "org-001",
  organisation_name: "Acme Care",
  organisation_verified: true,
  full_name: "Jane Smith",
  worker_role: "support_worker",
  qualifications: [{ name: "First Aid" }],
  capabilities: ["personal_care", "driving"],
  clearance_status: "cleared",
  clearance_expiry: new Date("2027-01-01"),
  active: true,
  created_at: new Date("2025-01-01T00:00:00Z"),
  updated_at: new Date("2025-06-15T12:00:00Z"),
};

function makeInput(overrides: Partial<BuildWorkerDocInput> = {}): BuildWorkerDocInput {
  return {
    row: BASE_ROW,
    orgLocation: { lat: -33.87, lng: 151.21 },
    orgServiceAreaTokens: ["parramatta", "NSW", "2150"],
    ...overrides,
  };
}

describe("buildWorkerDoc", () => {
  it("builds a complete document for a support worker who drives", () => {
    const doc = buildWorkerDoc(makeInput());

    expect(doc.id).toBe("wrk-001");
    expect(doc.entity_id).toBe("wrk-001");
    expect(doc.entity_type).toBe("worker");
    expect(doc.name).toBe("Jane Smith");
    expect(doc.worker_role).toBe("support_worker");
    expect(doc.can_drive).toBe(true);
    expect(doc.provides_care).toBe(true);
    expect(doc.provides_transport).toBe(true);
    expect(doc.capabilities).toEqual(["personal_care", "driving"]);
  });

  it("sets can_drive false when driving capability is absent", () => {
    const doc = buildWorkerDoc(
      makeInput({
        row: { ...BASE_ROW, capabilities: ["personal_care"] },
      }),
    );
    expect(doc.can_drive).toBe(false);
    expect(doc.provides_transport).toBe(false);
  });

  it("sets provides_care from care-related capabilities", () => {
    const doc = buildWorkerDoc(
      makeInput({
        row: { ...BASE_ROW, capabilities: ["community_access"] },
      }),
    );
    expect(doc.provides_care).toBe(true);
    expect(doc.provides_transport).toBe(false);
  });

  it("resolves transfer assist flag", () => {
    const doc = buildWorkerDoc(
      makeInput({
        row: { ...BASE_ROW, capabilities: ["wheelchair_transfer"] },
      }),
    );
    expect(doc.has_transfer_assist).toBe(true);
    expect(doc.has_wheelchair_transfer).toBe(true);
  });

  it("resolves manual handling flag", () => {
    const doc = buildWorkerDoc(
      makeInput({
        row: { ...BASE_ROW, capabilities: ["manual_handling"] },
      }),
    );
    expect(doc.has_manual_handling).toBe(true);
  });

  it("resolves medication administration flag", () => {
    const doc = buildWorkerDoc(
      makeInput({
        row: { ...BASE_ROW, capabilities: ["medication_administration"] },
      }),
    );
    expect(doc.has_medication_admin).toBe(true);
  });

  it("resolves positive behaviour support flag", () => {
    const doc = buildWorkerDoc(
      makeInput({
        row: { ...BASE_ROW, capabilities: ["positive_behaviour_support"] },
      }),
    );
    expect(doc.has_positive_behaviour_support).toBe(true);
  });

  it("resolves AAC flag when present", () => {
    const doc = buildWorkerDoc(
      makeInput({
        row: { ...BASE_ROW, capabilities: ["aac"] },
      }),
    );
    expect(doc.has_aac).toBe(true);
  });

  it("uses org location as worker geo centroid", () => {
    const doc = buildWorkerDoc(makeInput());
    expect(doc.location).toEqual([-33.87, 151.21]);
  });

  it("handles null org location", () => {
    const doc = buildWorkerDoc(makeInput({ orgLocation: null }));
    expect(doc.location).toBeNull();
  });

  it("inherits service area tokens from organisation", () => {
    const doc = buildWorkerDoc(makeInput());
    expect(doc.service_area_tokens).toEqual(["parramatta", "NSW", "2150"]);
  });

  it("sets clearance_current based on clearance_status", () => {
    const cleared = buildWorkerDoc(makeInput());
    expect(cleared.clearance_current).toBe(true);

    const expired = buildWorkerDoc(
      makeInput({
        row: { ...BASE_ROW, clearance_status: "expired" },
      }),
    );
    expect(expired.clearance_current).toBe(false);
  });

  it("carries organisation verification status", () => {
    const doc = buildWorkerDoc(makeInput());
    expect(doc.organisation_verified).toBe(true);

    const unverified = buildWorkerDoc(
      makeInput({
        row: { ...BASE_ROW, organisation_verified: false },
      }),
    );
    expect(unverified.organisation_verified).toBe(false);
  });

  it("converts updated_at to unix seconds", () => {
    const doc = buildWorkerDoc(makeInput());
    const expected = Math.floor(new Date("2025-06-15T12:00:00Z").getTime() / 1000);
    expect(doc.updated_at).toBe(expected);
  });

  it("defaults reliability score to 0", () => {
    const doc = buildWorkerDoc(makeInput());
    expect(doc.reliability_score).toBe(0);
  });

  it("uses provided reliability score", () => {
    const doc = buildWorkerDoc(makeInput({ reliabilityScore: 92 }));
    expect(doc.reliability_score).toBe(92);
  });

  it("handles worker with no capabilities (empty array)", () => {
    const doc = buildWorkerDoc(
      makeInput({ row: { ...BASE_ROW, capabilities: [] } }),
    );
    expect(doc.can_drive).toBe(false);
    expect(doc.provides_care).toBe(false);
    expect(doc.provides_transport).toBe(false);
    expect(doc.has_transfer_assist).toBe(false);
    expect(doc.has_manual_handling).toBe(false);
    expect(doc.has_medication_admin).toBe(false);
    expect(doc.has_positive_behaviour_support).toBe(false);
    expect(doc.has_aac).toBe(false);
  });
});
