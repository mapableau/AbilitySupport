/**
 * lib/consent — Consent management and enforcement.
 *
 * Usage:
 *   import { checkConsent, grantConsent, requiredConsentsFor } from "@/lib/consent";
 */

export * from "./types.js";
export {
  isConsentActive,
  buildConsentStatuses,
  checkConsent,
  consentDeniedResponse,
  requiredConsentsFor,
  CONSENT_REQUIREMENTS,
} from "./enforce.js";
export {
  getConsentsForParticipant,
  grantConsent,
  revokeConsent,
  revokeConsentsByType,
} from "./data.js";
