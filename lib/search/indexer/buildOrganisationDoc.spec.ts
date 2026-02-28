import { buildOrganisationDoc, type BuildOrgDocInput } from "./buildOrganisationDoc";
import type { OrganisationRow, OrgVehicleSummary } from "./types";

const BASE_ROW: OrganisationRow = {
  id: "org-001",
  name: "Acme Care",
  abn: "12345678901",
  org_type: "care",
  service_types: ["personal_care", "community_access"],
  lat: -33.87,
  lng: 151.21,
  suburb: "Parramatta",
  state: "NSW",
  postcode: "2150",
  contact_email: "hello@acme.care",
  contact_phone: "0299991234",
  website: "https://acme.care",
  verified: true,
  active: true,
  created_at: new Date("2025-01-01T00:00:00Z"),
  updated_at: new Date("2025-06-15T12:00:00Z"),
};

const NO_VEHICLES: OrgVehicleSummary = {
  total_vehicles: 0,
  wav_available: false,
  vehicle_types: [],
};

function makeInput(overrides: Partial<BuildOrgDocInput> = {}): BuildOrgDocInput {
  return {
    row: BASE_ROW,
    activeWorkerCount: 5,
    vehicles: NO_VEHICLES,
    workerCapabilities: ["personal_care"],
    ...overrides,
  };
}

describe("buildOrganisationDoc", () => {
  it("builds a complete document from a care organisation", () => {
    const doc = buildOrganisationDoc(makeInput());

    expect(doc.id).toBe("org-001");
    expect(doc.entity_id).toBe("org-001");
    expect(doc.entity_type).toBe("organisation");
    expect(doc.name).toBe("Acme Care");
    expect(doc.org_type).toBe("care");
    expect(doc.provides_care).toBe(true);
    expect(doc.provides_transport).toBe(false);
    expect(doc.verified).toBe(true);
    expect(doc.worker_count).toBe(5);
    expect(doc.location).toEqual([-33.87, 151.21]);
  });

  it("sets provides_transport for transport orgs", () => {
    const doc = buildOrganisationDoc(
      makeInput({ row: { ...BASE_ROW, org_type: "transport" } }),
    );
    expect(doc.provides_care).toBe(false);
    expect(doc.provides_transport).toBe(true);
  });

  it("sets both care and transport for 'both' org type", () => {
    const doc = buildOrganisationDoc(
      makeInput({ row: { ...BASE_ROW, org_type: "both" } }),
    );
    expect(doc.provides_care).toBe(true);
    expect(doc.provides_transport).toBe(true);
  });

  it("resolves WAV availability from vehicle summary", () => {
    const doc = buildOrganisationDoc(
      makeInput({
        vehicles: {
          total_vehicles: 3,
          wav_available: true,
          vehicle_types: ["sedan", "wheelchair_accessible"],
        },
      }),
    );
    expect(doc.wav_available).toBe(true);
    expect(doc.total_vehicles).toBe(3);
    expect(doc.vehicle_types).toEqual(["sedan", "wheelchair_accessible"]);
  });

  it("resolves transfer assist and manual handling from worker capabilities", () => {
    const doc = buildOrganisationDoc(
      makeInput({
        workerCapabilities: ["personal_care", "wheelchair_transfer", "manual_handling"],
      }),
    );
    expect(doc.has_transfer_assist).toBe(true);
    expect(doc.has_manual_handling).toBe(true);
  });

  it("builds service area tokens from suburb, state, postcode", () => {
    const doc = buildOrganisationDoc(makeInput());
    expect(doc.service_area_tokens).toContain("parramatta");
    expect(doc.service_area_tokens).toContain("NSW");
    expect(doc.service_area_tokens).toContain("2150");
    expect(doc.service_area_tokens).toContain("parramatta NSW");
  });

  it("handles null location gracefully", () => {
    const doc = buildOrganisationDoc(
      makeInput({ row: { ...BASE_ROW, lat: null, lng: null } }),
    );
    expect(doc.location).toBeNull();
  });

  it("handles missing address fields", () => {
    const doc = buildOrganisationDoc(
      makeInput({
        row: { ...BASE_ROW, suburb: null, state: null, postcode: null },
      }),
    );
    expect(doc.service_area_tokens).toEqual([]);
  });

  it("converts updated_at to unix seconds", () => {
    const doc = buildOrganisationDoc(makeInput());
    const expected = Math.floor(new Date("2025-06-15T12:00:00Z").getTime() / 1000);
    expect(doc.updated_at).toBe(expected);
  });

  it("uses provided reliability score", () => {
    const doc = buildOrganisationDoc(makeInput({ reliabilityScore: 87 }));
    expect(doc.reliability_score).toBe(87);
  });

  it("defaults reliability score to 0", () => {
    const doc = buildOrganisationDoc(makeInput());
    expect(doc.reliability_score).toBe(0);
  });

  it("defaults abn to empty string when null", () => {
    const doc = buildOrganisationDoc(
      makeInput({ row: { ...BASE_ROW, abn: null } }),
    );
    expect(doc.abn).toBe("");
  });
});
