import {
  isConsentActive,
  buildConsentStatuses,
  checkConsent,
  consentDeniedResponse,
  requiredConsentsFor,
  CONSENT_REQUIREMENTS,
} from "./enforce";
import type { ConsentRecord } from "./types";

const NOW = new Date("2026-03-01T12:00:00Z");

function makeRecord(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  return {
    id: "consent-1",
    participantProfileId: "pp-1",
    consentType: "data_sharing",
    grantedBy: "user-1",
    grantedAt: new Date("2026-01-01T00:00:00Z"),
    expiresAt: null,
    revokedAt: null,
    documentUrl: null,
    ...overrides,
  };
}

// ── isConsentActive ────────────────────────────────────────────────────────

describe("isConsentActive", () => {
  it("returns true for a granted, non-expired, non-revoked consent", () => {
    expect(isConsentActive(makeRecord(), NOW)).toBe(true);
  });

  it("returns false when revoked", () => {
    expect(isConsentActive(
      makeRecord({ revokedAt: new Date("2026-02-15") }),
      NOW,
    )).toBe(false);
  });

  it("returns false when expired", () => {
    expect(isConsentActive(
      makeRecord({ expiresAt: new Date("2026-02-01") }),
      NOW,
    )).toBe(false);
  });

  it("returns true when expires in the future", () => {
    expect(isConsentActive(
      makeRecord({ expiresAt: new Date("2027-01-01") }),
      NOW,
    )).toBe(true);
  });

  it("returns false when expires exactly at now", () => {
    expect(isConsentActive(
      makeRecord({ expiresAt: NOW }),
      NOW,
    )).toBe(false);
  });
});

// ── buildConsentStatuses ───────────────────────────────────────────────────

describe("buildConsentStatuses", () => {
  it("builds statuses from a list of records", () => {
    const records = [
      makeRecord({ consentType: "data_sharing" }),
      makeRecord({ consentType: "location" }),
    ];
    const statuses = buildConsentStatuses(records, NOW);
    expect(statuses).toHaveLength(2);
    expect(statuses.find((s) => s.type === "data_sharing")?.active).toBe(true);
    expect(statuses.find((s) => s.type === "location")?.active).toBe(true);
  });

  it("marks revoked consent as inactive", () => {
    const records = [
      makeRecord({ consentType: "location", revokedAt: new Date("2026-02-15") }),
    ];
    const statuses = buildConsentStatuses(records, NOW);
    expect(statuses[0].active).toBe(false);
  });

  it("uses most recent grant when multiple records exist", () => {
    const records = [
      makeRecord({ id: "old", consentType: "data_sharing", grantedAt: new Date("2025-01-01"), revokedAt: new Date("2025-06-01") }),
      makeRecord({ id: "new", consentType: "data_sharing", grantedAt: new Date("2026-01-01") }),
    ];
    const statuses = buildConsentStatuses(records, NOW);
    expect(statuses).toHaveLength(1);
    expect(statuses[0].active).toBe(true);
  });

  it("returns empty for no records", () => {
    expect(buildConsentStatuses([], NOW)).toEqual([]);
  });
});

// ── checkConsent ───────────────────────────────────────────────────────────

describe("checkConsent", () => {
  it("allows when all required scopes are active", () => {
    const records = [
      makeRecord({ consentType: "data_sharing" }),
      makeRecord({ consentType: "location" }),
    ];
    const result = checkConsent(records, ["data_sharing", "location"], NOW);
    expect(result.allowed).toBe(true);
  });

  it("denies when a required scope is missing", () => {
    const records = [makeRecord({ consentType: "data_sharing" })];
    const result = checkConsent(records, ["data_sharing", "location"], NOW);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.missing).toEqual(["location"]);
    }
  });

  it("denies when a required scope is revoked", () => {
    const records = [
      makeRecord({ consentType: "data_sharing" }),
      makeRecord({ consentType: "location", revokedAt: new Date("2026-02-15") }),
    ];
    const result = checkConsent(records, ["data_sharing", "location"], NOW);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.missing).toEqual(["location"]);
    }
  });

  it("denies when a required scope is expired", () => {
    const records = [
      makeRecord({ consentType: "data_sharing", expiresAt: new Date("2025-12-31") }),
    ];
    const result = checkConsent(records, ["data_sharing"], NOW);
    expect(result.allowed).toBe(false);
  });

  it("allows when no scopes are required", () => {
    expect(checkConsent([], [], NOW).allowed).toBe(true);
  });

  it("reports all missing scopes at once", () => {
    const result = checkConsent([], ["data_sharing", "location", "preference"], NOW);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.missing).toHaveLength(3);
      expect(result.missing).toContain("data_sharing");
      expect(result.missing).toContain("location");
      expect(result.missing).toContain("preference");
    }
  });
});

// ── consentDeniedResponse ──────────────────────────────────────────────────

describe("consentDeniedResponse", () => {
  it("builds a response with missing scopes", () => {
    const resp = consentDeniedResponse(["location", "preference"]);
    expect(resp.code).toBe("CONSENT_REQUIRED");
    expect(resp.missingConsents).toEqual(["location", "preference"]);
    expect(resp.error).toContain("location");
    expect(resp.error).toContain("preference");
  });
});

// ── requiredConsentsFor ────────────────────────────────────────────────────

describe("requiredConsentsFor", () => {
  it("returns location for share_location operation", () => {
    expect(requiredConsentsFor("share_location")).toEqual(["location"]);
  });

  it("returns location + transport for transport location sharing", () => {
    expect(requiredConsentsFor("share_transport_location")).toEqual(["location", "transport"]);
  });

  it("returns preference for store_preferences", () => {
    expect(requiredConsentsFor("store_preferences")).toEqual(["preference"]);
  });

  it("returns learning for store_learning_data", () => {
    expect(requiredConsentsFor("store_learning_data")).toEqual(["learning"]);
  });

  it("returns service_agreement for create_booking", () => {
    expect(requiredConsentsFor("create_booking")).toEqual(["service_agreement"]);
  });

  it("returns empty for unknown operation", () => {
    expect(requiredConsentsFor("nonexistent_operation")).toEqual([]);
  });
});

// ── CONSENT_REQUIREMENTS covers all three new scopes ───────────────────────

describe("CONSENT_REQUIREMENTS", () => {
  it("includes location scope", () => {
    const ops = CONSENT_REQUIREMENTS.filter((r) =>
      r.requiredScopes.includes("location"),
    );
    expect(ops.length).toBeGreaterThan(0);
  });

  it("includes preference scope", () => {
    const ops = CONSENT_REQUIREMENTS.filter((r) =>
      r.requiredScopes.includes("preference"),
    );
    expect(ops.length).toBeGreaterThan(0);
  });

  it("includes learning scope", () => {
    const ops = CONSENT_REQUIREMENTS.filter((r) =>
      r.requiredScopes.includes("learning"),
    );
    expect(ops.length).toBeGreaterThan(0);
  });
});
