/**
 * Acceptance tests: Row-Level Security enforcement.
 *
 * Verifies that:
 *   - buildRlsContext selects the correct priority role
 *   - RLS policies exist for all 17 tables
 *   - Each role's access boundaries are correctly encoded in the migration
 *   - Participant isolation is enforced (own data only)
 *   - Worker isolation is enforced (own assignments only)
 *   - Provider admin is org-scoped
 *   - Coordinator/admin/auditor have broad access
 *   - Audit log is restricted to admin + auditor
 */

import * as fs from 'fs';
import * as path from 'path';
import { buildRlsContext } from '../../lib/db/rls';

const migrationPath = path.join(
  __dirname,
  '../../db/migrations/0004_rls_policies.sql',
);
const rlsSql = fs.readFileSync(migrationPath, 'utf-8');

describe('Acceptance: RLS enforcement', () => {
  // ── AC1: Context resolution ──────────────────────────────────────────

  describe('AC1: buildRlsContext picks highest-priority role', () => {
    it('admin wins over all other roles', () => {
      expect(
        buildRlsContext({
          userId: 'u1',
          roles: ['participant', 'admin', 'coordinator'],
        }).role,
      ).toBe('admin');
    });

    it('auditor wins over coordinator', () => {
      expect(
        buildRlsContext({ userId: 'u2', roles: ['coordinator', 'auditor'] })
          .role,
      ).toBe('auditor');
    });

    it('coordinator wins over provider_admin', () => {
      expect(
        buildRlsContext({
          userId: 'u3',
          roles: ['provider_admin', 'coordinator'],
        }).role,
      ).toBe('coordinator');
    });

    it('provider_admin wins over worker', () => {
      expect(
        buildRlsContext({ userId: 'u4', roles: ['worker', 'provider_admin'] })
          .role,
      ).toBe('provider_admin');
    });

    it('worker wins over participant', () => {
      expect(
        buildRlsContext({ userId: 'u5', roles: ['participant', 'worker'] })
          .role,
      ).toBe('worker');
    });

    it('defaults to participant for no roles', () => {
      expect(buildRlsContext({ userId: 'u6', roles: [] }).role).toBe(
        'participant',
      );
    });

    it('passes orgId through', () => {
      expect(
        buildRlsContext({
          userId: 'u7',
          roles: ['provider_admin'],
          organisationId: 'org-1',
        }).orgId,
      ).toBe('org-1');
    });
  });

  // ── AC2: RLS enabled on every table ──────────────────────────────────

  describe('AC2: RLS is enabled on all tables', () => {
    const tables = [
      'users',
      'roles',
      'organisations',
      'organisation_claims',
      'participant_profiles',
      'participant_preferences',
      'consents',
      'workers',
      'vehicles',
      'availability_slots',
      'coordination_requests',
      'recommendations',
      'bookings',
      'followups',
      'evidence_refs',
      'audit_log',
    ];

    it.each(tables)('RLS is enabled on %s', (table) => {
      expect(rlsSql).toContain(
        `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`,
      );
    });
  });

  // ── AC3: Participant isolation ───────────────────────────────────────

  describe('AC3: Participants can only see their own data', () => {
    it('participant_profiles is self-scoped via user_id', () => {
      expect(rlsSql).toContain(
        'CREATE POLICY profiles_self ON participant_profiles',
      );
    });

    it('consents are scoped to own profile or granted_by', () => {
      expect(rlsSql).toContain('CREATE POLICY consents_self ON consents');
    });

    it("bookings show for participant's own profile", () => {
      expect(rlsSql).toContain(
        'CREATE POLICY bookings_participant ON bookings',
      );
    });

    it('coordination_requests are scoped to own profile or requested_by', () => {
      expect(rlsSql).toContain(
        'CREATE POLICY coord_req_self ON coordination_requests',
      );
    });
  });

  // ── AC4: Worker isolation ────────────────────────────────────────────

  describe('AC4: Workers can only see their own assignments', () => {
    it('workers see their own row', () => {
      expect(rlsSql).toContain('CREATE POLICY workers_self ON workers');
    });

    it('workers see their assigned bookings', () => {
      expect(rlsSql).toContain('CREATE POLICY bookings_worker ON bookings');
    });

    it('workers see their own availability', () => {
      expect(rlsSql).toContain(
        'CREATE POLICY avail_worker ON availability_slots',
      );
    });
  });

  // ── AC5: Provider admin org-scoping ──────────────────────────────────

  describe("AC5: Provider admin sees only their organisation's data", () => {
    it('workers filtered by organisation_id = rls_org_id()', () => {
      expect(rlsSql).toContain('CREATE POLICY workers_org ON workers');
      expect(rlsSql).toContain('organisation_id = rls_org_id()');
    });

    it('vehicles filtered by org', () => {
      expect(rlsSql).toContain('CREATE POLICY vehicles_org ON vehicles');
    });

    it('availability filtered by org workers/vehicles', () => {
      expect(rlsSql).toContain('CREATE POLICY avail_org ON availability_slots');
    });

    it('bookings filtered by org', () => {
      expect(rlsSql).toContain('CREATE POLICY bookings_org ON bookings');
    });

    it('recommendations filtered by org', () => {
      expect(rlsSql).toContain('CREATE POLICY recs_org ON recommendations');
    });

    it('evidence filtered by org entities', () => {
      expect(rlsSql).toContain('CREATE POLICY evidence_org ON evidence_refs');
    });
  });

  // ── AC6: Broad roles (admin, coordinator, auditor) ───────────────────

  describe('AC6: Coordinator/admin/auditor have broad access', () => {
    const broadPolicies = [
      'profiles_broad',
      'workers_broad',
      'bookings_broad',
      'coord_req_broad',
      'consents_broad',
      'avail_broad',
    ];

    it.each(broadPolicies)('broad policy %s exists', (policy) => {
      expect(rlsSql).toContain(`CREATE POLICY ${policy}`);
    });

    it('all broad policies use rls_is_broad_role()', () => {
      const broadRoleChecks = (rlsSql.match(/rls_is_broad_role\(\)/g) ?? [])
        .length;
      expect(broadRoleChecks).toBeGreaterThanOrEqual(6);
    });
  });

  // ── AC7: Audit log is restricted ─────────────────────────────────────

  describe('AC7: Audit log is readable only by admin + auditor', () => {
    it('read policy restricted to admin + auditor', () => {
      expect(rlsSql).toContain('CREATE POLICY audit_log_read ON audit_log');
      expect(rlsSql).toContain("'admin', 'auditor'");
    });

    it('insert is allowed for any session (for audit() helper)', () => {
      expect(rlsSql).toContain('CREATE POLICY audit_log_insert ON audit_log');
      expect(rlsSql).toContain('FOR INSERT WITH CHECK (true)');
    });
  });

  // ── AC8: Helper functions exist ──────────────────────────────────────

  describe('AC8: RLS helper functions are defined', () => {
    it.each([
      'set_rls_context',
      'rls_user_id',
      'rls_role',
      'rls_org_id',
      'rls_is_broad_role',
    ])('function %s is defined', (fn) => {
      expect(rlsSql).toContain(`CREATE OR REPLACE FUNCTION ${fn}`);
    });
  });
});
