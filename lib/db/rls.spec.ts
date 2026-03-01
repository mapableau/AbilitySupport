import { buildRlsContext } from "./rls";
import * as fs from "fs";
import * as path from "path";

// ═══════════════════════════════════════════════════════════════════════════
// Unit tests for buildRlsContext (pure function)
// ═══════════════════════════════════════════════════════════════════════════

describe("buildRlsContext", () => {
  it("selects admin as highest-priority role", () => {
    const ctx = buildRlsContext({
      userId: "u1",
      roles: ["participant", "admin", "coordinator"],
    });
    expect(ctx.role).toBe("admin");
    expect(ctx.userId).toBe("u1");
  });

  it("selects auditor over coordinator", () => {
    const ctx = buildRlsContext({
      userId: "u2",
      roles: ["coordinator", "auditor"],
    });
    expect(ctx.role).toBe("auditor");
  });

  it("selects coordinator over provider_admin", () => {
    const ctx = buildRlsContext({
      userId: "u3",
      roles: ["provider_admin", "coordinator"],
    });
    expect(ctx.role).toBe("coordinator");
  });

  it("selects provider_admin over worker", () => {
    const ctx = buildRlsContext({
      userId: "u4",
      roles: ["worker", "provider_admin"],
      organisationId: "org-1",
    });
    expect(ctx.role).toBe("provider_admin");
    expect(ctx.orgId).toBe("org-1");
  });

  it("defaults to participant when no roles match", () => {
    const ctx = buildRlsContext({ userId: "u5", roles: [] });
    expect(ctx.role).toBe("participant");
  });

  it("passes orgId through when provided", () => {
    const ctx = buildRlsContext({
      userId: "u6",
      roles: ["provider_admin"],
      organisationId: "org-99",
    });
    expect(ctx.orgId).toBe("org-99");
  });

  it("omits orgId when not provided", () => {
    const ctx = buildRlsContext({ userId: "u7", roles: ["participant"] });
    expect(ctx.orgId).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Policy verification tests — assert that the migration SQL contains
// the expected RLS policies for each table and role.
// ═══════════════════════════════════════════════════════════════════════════

const migrationPath = path.join(__dirname, "../../db/migrations/0004_rls_policies.sql");
const migrationSql = fs.readFileSync(migrationPath, "utf-8");

describe("RLS migration (0004_rls_policies.sql)", () => {
  // ── RLS enabled on every table ──────────────────────────────────────

  const tables = [
    "users", "roles", "organisations", "organisation_claims",
    "participant_profiles", "participant_preferences", "consents",
    "workers", "vehicles", "availability_slots",
    "coordination_requests", "recommendations", "bookings",
    "followups", "evidence_refs", "audit_log",
  ];

  it.each(tables)("enables RLS on %s", (table) => {
    expect(migrationSql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
  });

  // ── Participant isolation ───────────────────────────────────────────

  it("participant profiles are self-scoped via user_id", () => {
    expect(migrationSql).toContain("CREATE POLICY profiles_self ON participant_profiles");
    expect(migrationSql).toContain("user_id = rls_user_id()");
  });

  it("participant preferences are scoped to own profile", () => {
    expect(migrationSql).toContain("CREATE POLICY prefs_self ON participant_preferences");
  });

  it("consents are scoped to own profile or granted_by", () => {
    expect(migrationSql).toContain("CREATE POLICY consents_self ON consents");
    expect(migrationSql).toContain("granted_by = rls_user_id()");
  });

  it("bookings show for participant's own profile", () => {
    expect(migrationSql).toContain("CREATE POLICY bookings_participant ON bookings");
  });

  // ── Worker isolation ────────────────────────────────────────────────

  it("workers see their own row via user_id", () => {
    expect(migrationSql).toContain("CREATE POLICY workers_self ON workers");
  });

  it("workers see their assigned bookings", () => {
    expect(migrationSql).toContain("CREATE POLICY bookings_worker ON bookings");
  });

  it("workers see their own availability slots", () => {
    expect(migrationSql).toContain("CREATE POLICY avail_worker ON availability_slots");
  });

  // ── Provider admin org-scoping ──────────────────────────────────────

  it("provider_admin sees workers in their org", () => {
    expect(migrationSql).toContain("CREATE POLICY workers_org ON workers");
    expect(migrationSql).toContain("organisation_id = rls_org_id()");
  });

  it("provider_admin sees vehicles in their org", () => {
    expect(migrationSql).toContain("CREATE POLICY vehicles_org ON vehicles");
  });

  it("provider_admin sees availability for their org", () => {
    expect(migrationSql).toContain("CREATE POLICY avail_org ON availability_slots");
  });

  it("provider_admin sees recommendations for their org", () => {
    expect(migrationSql).toContain("CREATE POLICY recs_org ON recommendations");
  });

  it("provider_admin sees bookings for their org", () => {
    expect(migrationSql).toContain("CREATE POLICY bookings_org ON bookings");
  });

  it("provider_admin sees evidence for their org entities", () => {
    expect(migrationSql).toContain("CREATE POLICY evidence_org ON evidence_refs");
    expect(migrationSql).toContain("CREATE POLICY evidence_org_worker ON evidence_refs");
  });

  // ── Broad roles (admin, coordinator, auditor) ───────────────────────

  it("broad roles see all participant profiles", () => {
    expect(migrationSql).toContain("CREATE POLICY profiles_broad ON participant_profiles");
    expect(migrationSql).toContain("rls_is_broad_role()");
  });

  it("broad roles see all bookings", () => {
    expect(migrationSql).toContain("CREATE POLICY bookings_broad ON bookings");
  });

  it("broad roles see all workers", () => {
    expect(migrationSql).toContain("CREATE POLICY workers_broad ON workers");
  });

  it("broad roles see all coordination requests", () => {
    expect(migrationSql).toContain("CREATE POLICY coord_req_broad ON coordination_requests");
  });

  // ── Audit log restricted to admin + auditor ─────────────────────────

  it("audit log is readable only by admin and auditor", () => {
    expect(migrationSql).toContain("CREATE POLICY audit_log_read ON audit_log");
    expect(migrationSql).toContain("'admin', 'auditor'");
  });

  it("audit log allows inserts from any session", () => {
    expect(migrationSql).toContain("CREATE POLICY audit_log_insert ON audit_log");
    expect(migrationSql).toContain("FOR INSERT WITH CHECK (true)");
  });

  // ── Organisations are publicly readable ─────────────────────────────

  it("organisations are readable by everyone", () => {
    expect(migrationSql).toContain("CREATE POLICY orgs_read_all ON organisations");
    expect(migrationSql).toContain("FOR SELECT USING (true)");
  });

  // ── Helper functions exist ──────────────────────────────────────────

  it("defines set_rls_context function", () => {
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION set_rls_context");
  });

  it("defines rls_user_id helper", () => {
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION rls_user_id()");
  });

  it("defines rls_role helper", () => {
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION rls_role()");
  });

  it("defines rls_org_id helper", () => {
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION rls_org_id()");
  });

  it("defines rls_is_broad_role helper", () => {
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION rls_is_broad_role()");
  });
});
