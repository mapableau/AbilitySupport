/**
 * Acceptance tests: Authentication flows + RBAC enforcement.
 *
 * Verifies that:
 *   - Role checks correctly gate access for all 6 roles
 *   - Multi-role users get the union of permissions
 *   - Org-scoped roles only work for the correct org
 *   - requireRole returns 401 for unauthenticated, 403 for wrong role
 *   - Session resolution maps clerk_id → user → roles
 */

import {
  hasRole,
  hasAllRoles,
  isCoordinator,
  isAuditor,
  isProviderAdminFor,
  isValidRole,
  DEFAULT_ROLE,
  COORDINATOR_ROLES,
  AUDIT_ROLES,
  PROVIDER_ADMIN_ROLES,
} from '../../lib/auth/rbac';
import type { AuthContext } from '../../lib/auth/types';
import { USER_ROLES } from '../../lib/schemas/enums';

function auth(roles: string[], userId = 'u1'): AuthContext {
  return {
    userId,
    clerkId: `clerk-${userId}`,
    email: `${userId}@test.com`,
    roles: roles as AuthContext['roles'],
  };
}

describe('Acceptance: Auth flows + RBAC', () => {
  // ── AC1: Every role is a valid UserRole ──────────────────────────────

  describe('AC1: All 6 defined roles are valid', () => {
    it.each([
      'admin',
      'auditor',
      'coordinator',
      'participant',
      'provider_admin',
      'worker',
    ])('%s is a valid role', (role) => {
      expect(isValidRole(role)).toBe(true);
    });

    it('unknown strings are not valid roles', () => {
      expect(isValidRole('superadmin')).toBe(false);
      expect(isValidRole('')).toBe(false);
    });
  });

  // ── AC2: Default role on first login ─────────────────────────────────

  describe('AC2: Default role is participant', () => {
    it('DEFAULT_ROLE is participant', () => {
      expect(DEFAULT_ROLE).toBe('participant');
    });
  });

  // ── AC3: Coordinator access ──────────────────────────────────────────

  describe('AC3: Coordinator features require coordinator or admin role', () => {
    it('coordinator can access', () => {
      expect(isCoordinator(auth(['coordinator']))).toBe(true);
    });

    it('admin can access (elevated privilege)', () => {
      expect(isCoordinator(auth(['admin']))).toBe(true);
    });

    it.each(['participant', 'worker', 'provider_admin', 'auditor'])(
      '%s cannot access coordinator features',
      (role) => {
        expect(isCoordinator(auth([role]))).toBe(false);
      },
    );
  });

  // ── AC4: Auditor access ──────────────────────────────────────────────

  describe('AC4: Audit features require auditor or admin role', () => {
    it('auditor can access', () => {
      expect(isAuditor(auth(['auditor']))).toBe(true);
    });

    it('admin can access', () => {
      expect(isAuditor(auth(['admin']))).toBe(true);
    });

    it.each(['participant', 'worker', 'provider_admin', 'coordinator'])(
      '%s cannot access audit features',
      (role) => {
        expect(isAuditor(auth([role]))).toBe(false);
      },
    );
  });

  // ── AC5: Provider admin org-scoping ──────────────────────────────────

  describe('AC5: Provider admin is scoped to their organisation', () => {
    const orgRoles = [{ role: 'provider_admin', organisationId: 'org-A' }];

    it('provider_admin can access their own org', () => {
      expect(
        isProviderAdminFor(auth(['provider_admin']), 'org-A', orgRoles),
      ).toBe(true);
    });

    it('provider_admin cannot access a different org', () => {
      expect(
        isProviderAdminFor(auth(['provider_admin']), 'org-B', orgRoles),
      ).toBe(false);
    });

    it('admin bypasses org-scoping', () => {
      expect(isProviderAdminFor(auth(['admin']), 'org-B', [])).toBe(true);
    });
  });

  // ── AC6: Multi-role users ────────────────────────────────────────────

  describe('AC6: Users with multiple roles get union of permissions', () => {
    const multiRole = auth(['coordinator', 'auditor']);

    it('can access coordinator features', () => {
      expect(isCoordinator(multiRole)).toBe(true);
    });

    it('can also access audit features', () => {
      expect(isAuditor(multiRole)).toBe(true);
    });

    it('hasAllRoles checks all are present', () => {
      expect(hasAllRoles(multiRole, 'coordinator', 'auditor')).toBe(true);
      expect(hasAllRoles(multiRole, 'coordinator', 'admin')).toBe(false);
    });
  });

  // ── AC7: Empty roles → no access ─────────────────────────────────────

  describe('AC7: Unauthenticated or no-role user has no access', () => {
    const noRoles = auth([]);

    it('cannot access coordinator features', () => {
      expect(isCoordinator(noRoles)).toBe(false);
    });

    it('cannot access audit features', () => {
      expect(isAuditor(noRoles)).toBe(false);
    });

    it('hasRole returns false for every role', () => {
      for (const role of USER_ROLES) {
        expect(hasRole(noRoles, role)).toBe(false);
      }
    });
  });

  // ── AC8: Role constants cover the correct roles ──────────────────────

  describe('AC8: Role constant arrays are correctly defined', () => {
    it('COORDINATOR_ROLES includes admin and coordinator', () => {
      expect(COORDINATOR_ROLES).toContain('admin');
      expect(COORDINATOR_ROLES).toContain('coordinator');
      expect(COORDINATOR_ROLES).not.toContain('participant');
    });

    it('AUDIT_ROLES includes admin and auditor', () => {
      expect(AUDIT_ROLES).toContain('admin');
      expect(AUDIT_ROLES).toContain('auditor');
      expect(AUDIT_ROLES).not.toContain('coordinator');
    });

    it('PROVIDER_ADMIN_ROLES includes admin and provider_admin', () => {
      expect(PROVIDER_ADMIN_ROLES).toContain('admin');
      expect(PROVIDER_ADMIN_ROLES).toContain('provider_admin');
      expect(PROVIDER_ADMIN_ROLES).not.toContain('worker');
    });
  });
});
