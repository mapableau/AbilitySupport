/**
 * Acceptance tests: SSO linkage flows.
 *
 * Verifies that:
 *   - Federation source detection works for Disapedia + AccessiBooks + direct
 *   - FederatedIdentity is correctly extracted from Clerk webhook payloads
 *   - SSO link records contain correct provider + external_id + org_id
 *   - Role mapping from IdP claims produces correct MapAble roles
 *   - The sso_links migration has correct schema
 */

import {
  detectFederationSource,
  roleFromGroups,
  roleFromAccessiBooks,
  extractFederatedIdentity,
} from '../../lib/auth/federation';
import { createSsoLink } from '../../lib/auth/sso-link';
import * as fs from 'fs';
import * as path from 'path';

const ssoMigration = fs.readFileSync(
  path.join(__dirname, '../../db/migrations/0005_sso_links.sql'),
  'utf-8',
);

describe('Acceptance: SSO linkage', () => {
  // ── AC1: Disapedia OIDC detection ────────────────────────────────────

  describe('AC1: Disapedia login is detected via OIDC connection', () => {
    it('detects from external_accounts provider match', () => {
      const result = detectFederationSource(
        { external_accounts: [{ provider: 'conn_dis_123' }] },
        'conn_dis_123',
      );
      expect(result).toBe('disapedia');
    });

    it('falls back to publicMetadata.disapediaId', () => {
      const result = detectFederationSource({
        public_metadata: { disapediaId: 'user:42' },
      });
      expect(result).toBe('disapedia');
    });
  });

  // ── AC2: AccessiBooks SAML detection ─────────────────────────────────

  describe('AC2: AccessiBooks login is detected via SAML connection', () => {
    it('detects from external_accounts provider match', () => {
      const result = detectFederationSource(
        { external_accounts: [{ provider: 'conn_ab_456' }] },
        undefined,
        'conn_ab_456',
      );
      expect(result).toBe('accessibooks');
    });

    it('falls back to publicMetadata.accessibooksOrgId', () => {
      const result = detectFederationSource({
        public_metadata: { accessibooksOrgId: 'org:99' },
      });
      expect(result).toBe('accessibooks');
    });
  });

  // ── AC3: Direct login (no federation) ────────────────────────────────

  describe("AC3: Direct login returns 'direct' when no SSO signals", () => {
    it('returns direct for empty payload', () => {
      expect(detectFederationSource({})).toBe('direct');
    });

    it('returns direct for empty external_accounts and metadata', () => {
      expect(
        detectFederationSource({ external_accounts: [], public_metadata: {} }),
      ).toBe('direct');
    });
  });

  // ── AC4: Disapedia role mapping ──────────────────────────────────────

  describe('AC4: Disapedia group → role mapping', () => {
    const mapping = { accessibility_reviewers: 'auditor' as const };

    it('accessibility_reviewers group maps to auditor', () => {
      expect(roleFromGroups(['accessibility_reviewers'], mapping)).toBe(
        'auditor',
      );
    });

    it('editors group maps to default (participant)', () => {
      expect(roleFromGroups(['editors'], mapping)).toBe('participant');
    });

    it('empty groups map to participant', () => {
      expect(roleFromGroups([], mapping)).toBe('participant');
    });
  });

  // ── AC5: AccessiBooks role mapping ───────────────────────────────────

  describe('AC5: AccessiBooks SAML role → MapAble role mapping', () => {
    it.each([
      ['coordinator', 'coordinator'],
      ['plan_manager', 'coordinator'],
      ['Coordinator', 'coordinator'],
      ['auditor', 'auditor'],
      ['Auditor', 'auditor'],
    ] as const)("SAML role '%s' maps to '%s'", (samlRole, expected) => {
      expect(roleFromAccessiBooks(samlRole)).toBe(expected);
    });

    it('null SAML role defaults to provider_admin', () => {
      expect(roleFromAccessiBooks(null)).toBe('provider_admin');
    });

    it('unknown SAML role defaults to provider_admin', () => {
      expect(roleFromAccessiBooks('accountant')).toBe('provider_admin');
    });
  });

  // ── AC6: Identity extraction ─────────────────────────────────────────

  describe('AC6: FederatedIdentity extracted from Clerk payload', () => {
    it('extracts Disapedia identity with all fields', () => {
      const id = extractFederatedIdentity(
        {
          id: 'clerk_1',
          email_addresses: [{ email_address: 'alice@disapedia.org' }],
          first_name: 'Alice',
          last_name: 'Test',
          image_url: 'https://img.example.com/a.jpg',
          external_accounts: [{ provider: 'conn_dis' }],
          public_metadata: {
            disapediaId: 'user:1',
            disapediaGroups: ['editors'],
          },
        },
        'conn_dis',
      );
      expect(id.federationSource).toBe('disapedia');
      expect(id.email).toBe('alice@disapedia.org');
      expect(id.fullName).toBe('Alice Test');
      expect(id.disapediaId).toBe('user:1');
      expect(id.groups).toEqual(['editors']);
    });

    it('extracts AccessiBooks identity with org_id and role', () => {
      const id = extractFederatedIdentity(
        {
          id: 'clerk_2',
          email_addresses: [{ email_address: 'sarah@acme.com.au' }],
          first_name: 'Sarah',
          last_name: 'Coord',
          external_accounts: [{ provider: 'conn_ab' }],
          public_metadata: {
            accessibooksOrgId: 'org-acme',
            accessibooksRole: 'coordinator',
          },
        },
        undefined,
        'conn_ab',
      );
      expect(id.federationSource).toBe('accessibooks');
      expect(id.accessibooksOrgId).toBe('org-acme');
      expect(id.accessibooksRole).toBe('coordinator');
    });
  });

  // ── AC7: SSO link creation ───────────────────────────────────────────

  describe('AC7: SSO link records store correct provider data', () => {
    it('creates a Disapedia link with provider + external_id', async () => {
      const link = await createSsoLink({
        userId: 'user-1',
        provider: 'disapedia',
        externalId: 'user:42',
        email: 'alice@disapedia.org',
      });
      expect(link.provider).toBe('disapedia');
      expect(link.externalId).toBe('user:42');
      expect(link.userId).toBe('user-1');
      expect(link.active).toBe(true);
    });

    it('creates an AccessiBooks link with org + role', async () => {
      const link = await createSsoLink({
        userId: 'user-2',
        provider: 'accessibooks',
        externalId: 'sarah@acme.com.au',
        organisationId: 'org-acme',
        providerRole: 'coordinator',
      });
      expect(link.provider).toBe('accessibooks');
      expect(link.organisationId).toBe('org-acme');
      expect(link.providerRole).toBe('coordinator');
    });
  });

  // ── AC8: sso_links migration schema ──────────────────────────────────

  describe('AC8: sso_links migration has correct schema', () => {
    it('creates sso_links table', () => {
      expect(ssoMigration).toContain('CREATE TABLE sso_links');
    });

    it('has UNIQUE (provider, external_id)', () => {
      expect(ssoMigration).toContain('UNIQUE (provider, external_id)');
    });

    it('has provider CHECK constraint', () => {
      expect(ssoMigration).toContain("'disapedia'");
      expect(ssoMigration).toContain("'accessibooks'");
    });

    it('has RLS enabled', () => {
      expect(ssoMigration).toContain(
        'ALTER TABLE sso_links ENABLE ROW LEVEL SECURITY',
      );
    });

    it('has self + broad RLS policies', () => {
      expect(ssoMigration).toContain('CREATE POLICY sso_links_self');
      expect(ssoMigration).toContain('CREATE POLICY sso_links_broad');
    });
  });
});
