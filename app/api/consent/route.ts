/**
 * GET  /api/consent?participant_profile_id=<uuid>
 *   — List consent statuses for a participant (which scopes are active/inactive)
 *
 * POST /api/consent
 *   — Grant a new consent scope
 *   Body: { participantProfileId, consentType, expiresAt?, documentUrl? }
 */

import { z } from "zod";
import { CONSENT_TYPES } from "../../../lib/schemas/enums.js";
import {
  getConsentsForParticipant,
  grantConsent,
  buildConsentStatuses,
} from "../../../lib/consent/index.js";
import {
  getAuthContext,
  unauthorizedResponse,
} from "../../../lib/auth/index.js";
import { audit } from "../../../lib/db/audit.js";

const grantSchema = z.object({
  participantProfileId: z.string().uuid(),
  consentType: z.enum(CONSENT_TYPES),
  expiresAt: z.coerce.date().optional(),
  documentUrl: z.string().url().optional(),
});

export async function GET(request: Request): Promise<Response> {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorizedResponse();

  const url = new URL(request.url);
  const profileId = url.searchParams.get("participant_profile_id");
  if (!profileId) {
    return Response.json(
      { error: "Missing participant_profile_id query param" },
      { status: 400 },
    );
  }

  const records = await getConsentsForParticipant(profileId);
  const statuses = buildConsentStatuses(records);

  const allTypes = CONSENT_TYPES.map((type) => {
    const existing = statuses.find((s) => s.type === type);
    return existing ?? { type, granted: false, grantedAt: null, expiresAt: null, revokedAt: null, active: false };
  });

  return Response.json({ consents: allTypes });
}

export async function POST(request: Request): Promise<Response> {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = grantSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const record = await grantConsent({
    participantProfileId: parsed.data.participantProfileId,
    consentType: parsed.data.consentType,
    grantedBy: auth.userId,
    expiresAt: parsed.data.expiresAt,
    documentUrl: parsed.data.documentUrl,
  });

  await audit({
    userId: auth.userId,
    action: "consent_granted",
    entityType: "consents",
    entityId: record.id,
    summary: `Granted ${parsed.data.consentType} consent`,
  });

  return Response.json({ consent: record }, { status: 201 });
}
