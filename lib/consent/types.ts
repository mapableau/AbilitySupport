/**
 * lib/consent/types.ts — Consent record types.
 */

import type { ConsentType } from "../schemas/enums.js";

export interface ConsentRecord {
  id: string;
  participantProfileId: string;
  consentType: ConsentType;
  grantedBy: string;
  grantedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  documentUrl: string | null;
}

export interface ConsentStatus {
  type: ConsentType;
  granted: boolean;
  grantedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  active: boolean;
}

/** Maps data operations to the consent scopes they require. */
export interface ConsentRequirement {
  operation: string;
  requiredScopes: ConsentType[];
  description: string;
}
