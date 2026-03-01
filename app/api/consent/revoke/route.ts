/**
 * POST /api/consent/revoke — Revoke a consent scope.
 *
 * Body: { consentId: uuid } or { participantProfileId: uuid, consentType: string }
 * Revokes by ID or by type (revokes all active consents of that type).
 */

import { z } from "zod";
import { CONSENT_TYPES } from "../../../../lib/schemas/enums.js";
import {
  revokeConsent,
  revokeConsentsByType,
} from "../../../../lib/consent/index.js";
import {
  getAuthContext,
  unauthorizedResponse,
} from "../../../../lib/auth/index.js";
import { audit } from "../../../../lib/db/audit.js";

const revokeByIdSchema = z.object({
  consentId: z.string().uuid(),
});

const revokeByTypeSchema = z.object({
  participantProfileId: z.string().uuid(),
  consentType: z.enum(CONSENT_TYPES),
});

export async function POST(request: Request): Promise<Response> {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const byId = revokeByIdSchema.safeParse(body);
  if (byId.success) {
    const ok = await revokeConsent(byId.data.consentId, auth.userId);
    if (!ok) {
      return Response.json({ error: "Consent not found or already revoked" }, { status: 404 });
    }

    await audit({
      userId: auth.userId,
      action: "consent_revoked",
      entityType: "consents",
      entityId: byId.data.consentId,
      summary: "Revoked consent by ID",
    });

    return Response.json({ success: true, revokedId: byId.data.consentId });
  }

  const byType = revokeByTypeSchema.safeParse(body);
  if (byType.success) {
    const count = await revokeConsentsByType(
      byType.data.participantProfileId,
      byType.data.consentType,
    );

    await audit({
      userId: auth.userId,
      action: "consent_revoked",
      entityType: "consents",
      summary: `Revoked all ${byType.data.consentType} consents (${count} records)`,
    });

    return Response.json({
      success: true,
      consentType: byType.data.consentType,
      revokedCount: count,
    });
  }

  return Response.json(
    { error: "Provide either { consentId } or { participantProfileId, consentType }" },
    { status: 400 },
  );
}
