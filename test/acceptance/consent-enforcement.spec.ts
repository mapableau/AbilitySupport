/**
 * Acceptance tests: Consent enforcement.
 *
 * Verifies that:
 *   - All 8 consent scopes are defined (including location, preference, learning)
 *   - Consent active/revoked/expired logic is correct
 *   - Operations are mapped to required consent scopes
 *   - Missing consent produces a clear CONSENT_REQUIRED error
 *   - Multi-scope operations require ALL scopes to be active
 *   - Re-granted consent after revocation is treated as active
 */

import {
  isConsentActive,
  checkConsent,
  buildConsentStatuses,
  consentDeniedResponse,
  requiredConsentsFor,
  CONSENT_REQUIREMENTS,
} from '../../lib/consent/enforce';
import { CONSENT_TYPES } from '../../lib/schemas/enums';
import type { ConsentRecord } from '../../lib/consent/types';

const NOW = new Date('2026-03-01T12:00:00Z');

function consent(
  type: string,
  overrides: Partial<ConsentRecord> = {},
): ConsentRecord {
  return {
    id: crypto.randomUUID(),
    participantProfileId: 'pp-1',
    consentType: type as ConsentRecord['consentType'],
    grantedBy: 'user-1',
    grantedAt: new Date('2026-01-01'),
    expiresAt: null,
    revokedAt: null,
    documentUrl: null,
    ...overrides,
  };
}

describe('Acceptance: Consent enforcement', () => {
  // ── AC1: All 8 consent scopes exist ──────────────────────────────────

  describe('AC1: All required consent scopes are defined', () => {
    it.each([
      'data_sharing',
      'location',
      'preference',
      'learning',
      'transport',
      'service_agreement',
      'plan_management',
      'medical_info',
    ])("CONSENT_TYPES includes '%s'", (type) => {
      expect((CONSENT_TYPES as readonly string[]).includes(type)).toBe(true);
    });

    it('has exactly 8 consent types', () => {
      expect(CONSENT_TYPES).toHaveLength(8);
    });
  });

  // ── AC2: Active consent ──────────────────────────────────────────────

  describe('AC2: Active consent is correctly identified', () => {
    it('granted + no expiry + no revocation = active', () => {
      expect(isConsentActive(consent('location'), NOW)).toBe(true);
    });

    it('granted + future expiry = active', () => {
      expect(
        isConsentActive(
          consent('location', { expiresAt: new Date('2027-01-01') }),
          NOW,
        ),
      ).toBe(true);
    });
  });

  // ── AC3: Revoked consent ─────────────────────────────────────────────

  describe('AC3: Revoked consent blocks access', () => {
    it('revoked consent is not active', () => {
      expect(
        isConsentActive(
          consent('location', { revokedAt: new Date('2026-02-01') }),
          NOW,
        ),
      ).toBe(false);
    });

    it('checkConsent reports revoked scope as missing', () => {
      const records = [
        consent('location', { revokedAt: new Date('2026-02-01') }),
      ];
      const result = checkConsent(records, ['location'], NOW);
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.missing).toEqual(['location']);
    });
  });

  // ── AC4: Expired consent ─────────────────────────────────────────────

  describe('AC4: Expired consent blocks access', () => {
    it('past expiry = not active', () => {
      expect(
        isConsentActive(
          consent('preference', { expiresAt: new Date('2026-02-01') }),
          NOW,
        ),
      ).toBe(false);
    });

    it('exactly at expiry = not active', () => {
      expect(
        isConsentActive(consent('preference', { expiresAt: NOW }), NOW),
      ).toBe(false);
    });
  });

  // ── AC5: Location consent required for location sharing ──────────────

  describe('AC5: Location sharing requires location consent', () => {
    it('share_location requires location scope', () => {
      expect(requiredConsentsFor('share_location')).toEqual(['location']);
    });

    it('allowed when location consent is active', () => {
      const records = [consent('location')];
      const result = checkConsent(
        records,
        requiredConsentsFor('share_location'),
        NOW,
      );
      expect(result.allowed).toBe(true);
    });

    it('denied when location consent is missing', () => {
      const result = checkConsent(
        [],
        requiredConsentsFor('share_location'),
        NOW,
      );
      expect(result.allowed).toBe(false);
    });
  });

  // ── AC6: Preference consent ──────────────────────────────────────────

  describe('AC6: Storing preferences requires preference consent', () => {
    it('store_preferences requires preference scope', () => {
      expect(requiredConsentsFor('store_preferences')).toEqual(['preference']);
    });

    it('allowed when preference consent is active', () => {
      const records = [consent('preference')];
      const result = checkConsent(
        records,
        requiredConsentsFor('store_preferences'),
        NOW,
      );
      expect(result.allowed).toBe(true);
    });
  });

  // ── AC7: Learning consent ────────────────────────────────────────────

  describe('AC7: Learning data requires learning consent', () => {
    it('store_learning_data requires learning scope', () => {
      expect(requiredConsentsFor('store_learning_data')).toEqual(['learning']);
    });

    it('denied without learning consent', () => {
      const result = checkConsent(
        [],
        requiredConsentsFor('store_learning_data'),
        NOW,
      );
      expect(result.allowed).toBe(false);
    });
  });

  // ── AC8: Multi-scope operations ──────────────────────────────────────

  describe('AC8: Multi-scope operations require ALL scopes', () => {
    it('transport location needs both location + transport', () => {
      const required = requiredConsentsFor('share_transport_location');
      expect(required).toEqual(['location', 'transport']);
    });

    it('fails if only one of two required scopes is active', () => {
      const records = [consent('location')];
      const result = checkConsent(records, ['location', 'transport'], NOW);
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.missing).toEqual(['transport']);
    });

    it('passes when both are active', () => {
      const records = [consent('location'), consent('transport')];
      const result = checkConsent(records, ['location', 'transport'], NOW);
      expect(result.allowed).toBe(true);
    });

    it('medical info needs medical_info + data_sharing', () => {
      expect(requiredConsentsFor('share_medical_info')).toEqual([
        'medical_info',
        'data_sharing',
      ]);
    });
  });

  // ── AC9: Consent denied response ─────────────────────────────────────

  describe('AC9: CONSENT_REQUIRED error response', () => {
    it('lists all missing scopes', () => {
      const resp = consentDeniedResponse([
        'location',
        'preference',
        'learning',
      ]);
      expect(resp.code).toBe('CONSENT_REQUIRED');
      expect(resp.missingConsents).toEqual([
        'location',
        'preference',
        'learning',
      ]);
      expect(resp.error).toContain('location');
      expect(resp.error).toContain('preference');
      expect(resp.error).toContain('learning');
    });
  });

  // ── AC10: Re-granted consent after revocation ────────────────────────

  describe('AC10: Re-granted consent overrides previous revocation', () => {
    it('newer active grant takes precedence over older revocation', () => {
      const records = [
        consent('location', {
          grantedAt: new Date('2026-01-01'),
          revokedAt: new Date('2026-01-15'),
        }),
        consent('location', { grantedAt: new Date('2026-02-01') }),
      ];
      const statuses = buildConsentStatuses(records, NOW);
      const locationStatus = statuses.find((s) => s.type === 'location');
      expect(locationStatus?.active).toBe(true);
    });
  });

  // ── AC11: CONSENT_REQUIREMENTS covers all operations ─────────────────

  describe('AC11: Every registered operation has valid consent scopes', () => {
    it('all operations have at least one required scope', () => {
      for (const req of CONSENT_REQUIREMENTS) {
        expect(req.requiredScopes.length).toBeGreaterThan(0);
        for (const scope of req.requiredScopes) {
          expect((CONSENT_TYPES as readonly string[]).includes(scope)).toBe(
            true,
          );
        }
      }
    });

    it('has at least 8 registered operations', () => {
      expect(CONSENT_REQUIREMENTS.length).toBeGreaterThanOrEqual(8);
    });
  });
});
