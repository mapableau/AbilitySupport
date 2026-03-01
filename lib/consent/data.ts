/**
 * lib/consent/data.ts — Data access for consent records.
 *
 * All functions are stubbed with Drizzle TODOs.
 */

import type { ConsentType } from "../schemas/enums.js";
import type { ConsentRecord } from "./types.js";

/**
 * Fetch all consent records for a participant (active + inactive).
 */
export async function getConsentsForParticipant(
  participantProfileId: string,
): Promise<ConsentRecord[]> {
  // TODO: SELECT * FROM consents WHERE participant_profile_id = $1 ORDER BY granted_at DESC
  console.log(`[consent] getConsentsForParticipant(${participantProfileId}) — stub`);
  return [];
}

/**
 * Grant a new consent. Creates a consent record with granted_at = now().
 */
export async function grantConsent(params: {
  participantProfileId: string;
  consentType: ConsentType;
  grantedBy: string;
  expiresAt?: Date;
  documentUrl?: string;
}): Promise<ConsentRecord> {
  // TODO: INSERT INTO consents (...) VALUES (...) RETURNING *
  console.log(`[consent] grantConsent(${params.participantProfileId}, ${params.consentType}) — stub`);
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    participantProfileId: params.participantProfileId,
    consentType: params.consentType,
    grantedBy: params.grantedBy,
    grantedAt: now,
    expiresAt: params.expiresAt ?? null,
    revokedAt: null,
    documentUrl: params.documentUrl ?? null,
  };
}

/**
 * Revoke an existing consent. Sets revoked_at = now().
 */
export async function revokeConsent(
  consentId: string,
  _revokedBy: string,
): Promise<boolean> {
  // TODO: UPDATE consents SET revoked_at = now(), updated_at = now() WHERE id = $1 AND revoked_at IS NULL
  console.log(`[consent] revokeConsent(${consentId}) — stub`);
  return true;
}

/**
 * Revoke all consents of a given type for a participant.
 */
export async function revokeConsentsByType(
  participantProfileId: string,
  consentType: ConsentType,
): Promise<number> {
  // TODO: UPDATE consents SET revoked_at = now() WHERE participant_profile_id = $1
  //   AND consent_type = $2 AND revoked_at IS NULL
  console.log(`[consent] revokeConsentsByType(${participantProfileId}, ${consentType}) — stub`);
  return 0;
}
