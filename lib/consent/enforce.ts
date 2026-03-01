/**
 * lib/consent/enforce.ts — Consent enforcement (pure functions).
 *
 * Checks whether a participant has active consent for a given scope
 * before data is accessed or stored. No DB calls — the caller passes
 * in the consent records, and these functions evaluate them.
 *
 * A consent is active when:
 *   1. It has been granted (grantedAt is set)
 *   2. It has NOT been revoked (revokedAt is null)
 *   3. It has NOT expired (expiresAt is null OR expiresAt > now)
 */

import type { ConsentType } from "../schemas/enums.js";
import type { ConsentRecord, ConsentStatus, ConsentRequirement } from "./types.js";

/**
 * Check if a single consent record is currently active.
 */
export function isConsentActive(
  record: ConsentRecord,
  now: Date = new Date(),
): boolean {
  if (record.revokedAt !== null) return false;
  if (record.expiresAt !== null && record.expiresAt <= now) return false;
  return true;
}

/**
 * From a list of consent records, determine the status of each consent type.
 * Returns one status entry per consent type, using the most recent active
 * grant if multiple exist.
 */
export function buildConsentStatuses(
  records: ConsentRecord[],
  now: Date = new Date(),
): ConsentStatus[] {
  const byType = new Map<ConsentType, ConsentRecord[]>();

  for (const r of records) {
    const existing = byType.get(r.consentType) ?? [];
    existing.push(r);
    byType.set(r.consentType, existing);
  }

  const statuses: ConsentStatus[] = [];

  for (const [type, recs] of byType) {
    const sorted = recs.sort(
      (a, b) => b.grantedAt.getTime() - a.grantedAt.getTime(),
    );
    const latest = sorted[0];
    const active = isConsentActive(latest, now);

    statuses.push({
      type,
      granted: true,
      grantedAt: latest.grantedAt,
      expiresAt: latest.expiresAt,
      revokedAt: latest.revokedAt,
      active,
    });
  }

  return statuses;
}

/**
 * Check whether a participant has active consent for ALL of the required scopes.
 * Returns { allowed: true } or { allowed: false, missing: [...] }.
 */
export function checkConsent(
  records: ConsentRecord[],
  requiredScopes: ConsentType[],
  now: Date = new Date(),
): { allowed: true } | { allowed: false; missing: ConsentType[] } {
  if (requiredScopes.length === 0) return { allowed: true };

  const activeScopes = new Set<ConsentType>();
  for (const r of records) {
    if (isConsentActive(r, now)) {
      activeScopes.add(r.consentType);
    }
  }

  const missing = requiredScopes.filter((s) => !activeScopes.has(s));

  if (missing.length === 0) return { allowed: true };
  return { allowed: false, missing };
}

/**
 * Build a 403 response body explaining which consent scopes are missing.
 */
export function consentDeniedResponse(missing: ConsentType[]): {
  error: string;
  code: string;
  missingConsents: ConsentType[];
} {
  return {
    error: `Missing required consent: ${missing.join(", ")}. Please grant consent before proceeding.`,
    code: "CONSENT_REQUIRED",
    missingConsents: missing,
  };
}

// ── Consent requirements registry ──────────────────────────────────────────

/**
 * Maps data operations to the consent scopes they require.
 * API routes check this before accessing participant data.
 */
export const CONSENT_REQUIREMENTS: ConsentRequirement[] = [
  {
    operation: "share_profile_with_provider",
    requiredScopes: ["data_sharing"],
    description: "Share participant profile with matched providers",
  },
  {
    operation: "share_location",
    requiredScopes: ["location"],
    description: "Share home location for proximity matching",
  },
  {
    operation: "share_transport_location",
    requiredScopes: ["location", "transport"],
    description: "Share pickup/dropoff locations for transport coordination",
  },
  {
    operation: "store_preferences",
    requiredScopes: ["preference"],
    description: "Store communication, gender, and accessibility preferences",
  },
  {
    operation: "store_learning_data",
    requiredScopes: ["learning"],
    description: "Store interaction history to improve AI recommendations",
  },
  {
    operation: "view_plan_budget",
    requiredScopes: ["plan_management"],
    description: "View NDIS plan budget and line items",
  },
  {
    operation: "share_medical_info",
    requiredScopes: ["medical_info", "data_sharing"],
    description: "Disclose health notes to assigned support worker",
  },
  {
    operation: "create_booking",
    requiredScopes: ["service_agreement"],
    description: "Enter into service bookings with an organisation",
  },
];

/**
 * Look up which consent scopes are required for a given operation.
 */
export function requiredConsentsFor(operation: string): ConsentType[] {
  const req = CONSENT_REQUIREMENTS.find((r) => r.operation === operation);
  return req?.requiredScopes ?? [];
}
