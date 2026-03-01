/**
 * Acceptance tests: Audit logging.
 *
 * Verifies that:
 *   - audit_log table schema supports all required fields
 *   - The 12 action types are defined
 *   - Audit log is immutable (trigger prevents UPDATE/DELETE)
 *   - AuditEntry type covers required fields
 *   - RLS restricts audit_log reads to admin + auditor
 *   - Insert is allowed from any session
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AuditEntry } from '../../lib/db/audit';

const auditMigration = fs.readFileSync(
  path.join(__dirname, '../../db/migrations/0003_audit_log.sql'),
  'utf-8',
);

const rlsMigration = fs.readFileSync(
  path.join(__dirname, '../../db/migrations/0004_rls_policies.sql'),
  'utf-8',
);

describe('Acceptance: Audit logs', () => {
  // ── AC1: Table schema ────────────────────────────────────────────────

  describe('AC1: audit_log table has all required columns', () => {
    it('creates audit_log table', () => {
      expect(auditMigration).toContain('CREATE TABLE audit_log');
    });

    it.each([
      'user_id',
      'clerk_id',
      'ip_address',
      'action',
      'entity_type',
      'entity_id',
      'summary',
      'diff',
      'metadata',
      'created_at',
    ])('has column %s', (col) => {
      expect(auditMigration).toContain(col);
    });

    it('does NOT have updated_at (immutable by design)', () => {
      const lines = auditMigration
        .split('\n')
        .filter((l) => l.includes('updated_at') && !l.trim().startsWith('--'));
      const tableLines = lines.filter(
        (l) => !l.includes('FUNCTION') && !l.includes('TRIGGER'),
      );
      expect(tableLines).toHaveLength(0);
    });
  });

  // ── AC2: Action types ────────────────────────────────────────────────

  describe('AC2: All 12 audit action types are defined', () => {
    const actions = [
      'create',
      'read',
      'update',
      'delete',
      'login',
      'logout',
      'consent_granted',
      'consent_revoked',
      'role_assigned',
      'role_removed',
      'export',
      'escalation',
    ];

    it.each(actions)("action '%s' is in CHECK constraint", (action) => {
      expect(auditMigration).toContain(`'${action}'`);
    });
  });

  // ── AC3: Immutability ────────────────────────────────────────────────

  describe('AC3: Audit log rows are immutable', () => {
    it('has a prevent_audit_mutation trigger', () => {
      expect(auditMigration).toContain(
        'CREATE OR REPLACE FUNCTION prevent_audit_mutation',
      );
    });

    it('trigger fires BEFORE UPDATE OR DELETE', () => {
      expect(auditMigration).toContain('BEFORE UPDATE OR DELETE ON audit_log');
    });

    it('trigger raises an exception', () => {
      expect(auditMigration).toContain('RAISE EXCEPTION');
      expect(auditMigration).toContain('immutable');
    });
  });

  // ── AC4: Indexes ─────────────────────────────────────────────────────

  describe('AC4: Audit log has performance indexes', () => {
    it.each([
      'idx_audit_log_user_id',
      'idx_audit_log_action',
      'idx_audit_log_entity',
      'idx_audit_log_created_at',
      'idx_audit_log_user_time',
    ])('index %s exists', (idx) => {
      expect(auditMigration).toContain(idx);
    });
  });

  // ── AC5: AuditEntry type ─────────────────────────────────────────────

  describe('AC5: AuditEntry TypeScript type covers required fields', () => {
    it('accepts a minimal audit entry', () => {
      const entry: AuditEntry = {
        action: 'read',
        entityType: 'users',
        summary: 'Read user profile',
      };
      expect(entry.action).toBe('read');
      expect(entry.entityType).toBe('users');
    });

    it('accepts a full audit entry with all optional fields', () => {
      const entry: AuditEntry = {
        userId: 'user-1',
        clerkId: 'clerk-1',
        ipAddress: '10.0.0.1',
        action: 'update',
        entityType: 'participant_profiles',
        entityId: 'pp-1',
        summary: 'Updated address',
        diff: { before: { suburb: 'Old' }, after: { suburb: 'New' } },
        metadata: { route: '/api/participants/pp-1', userAgent: 'Chrome' },
      };
      expect(entry.userId).toBe('user-1');
      expect(entry.diff).toBeDefined();
    });
  });

  // ── AC6: RLS on audit_log ────────────────────────────────────────────

  describe('AC6: Audit log RLS restricts reads to admin + auditor', () => {
    it('read policy exists', () => {
      expect(rlsMigration).toContain(
        'CREATE POLICY audit_log_read ON audit_log',
      );
    });

    it('read policy checks for admin or auditor role', () => {
      const readPolicyStart = rlsMigration.indexOf('audit_log_read');
      const policySlice = rlsMigration.slice(
        readPolicyStart,
        readPolicyStart + 200,
      );
      expect(policySlice).toContain("'admin'");
      expect(policySlice).toContain("'auditor'");
    });

    it('insert policy allows any session', () => {
      expect(rlsMigration).toContain(
        'CREATE POLICY audit_log_insert ON audit_log',
      );
      expect(rlsMigration).toContain('FOR INSERT WITH CHECK (true)');
    });
  });
});
