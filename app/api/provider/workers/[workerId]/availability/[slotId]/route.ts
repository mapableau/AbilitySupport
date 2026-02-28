/**
 * /api/provider/workers/[workerId]/availability/[slotId] — Single slot ops.
 *
 * PUT    — update slot times/recurrence/availability
 * DELETE — remove slot
 *
 * Both emit availability/updated so Typesense is reindexed.
 */

import { updateAvailabilitySlotSchema } from "../../../../../../../lib/schemas/availability.js";
import {
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
} from "../../../../../../../lib/provider-pool/data.js";
import {
  getProviderAuth,
  unauthorizedResponse,
} from "../../../../../../../lib/provider-pool/auth.js";
import { inngest } from "../../../../../../../lib/workflows/inngest/client.js";

interface RouteContext {
  params: Promise<{ workerId: string; slotId: string }>;
}

export async function PUT(request: Request, ctx: RouteContext): Promise<Response> {
  const auth = await getProviderAuth(request);
  if (!auth) return unauthorizedResponse();

  const { workerId, slotId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateAvailabilitySlotSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const slot = await updateAvailabilitySlot(slotId, auth.organisationId, parsed.data);
  if (!slot) {
    return Response.json({ error: "Slot not found" }, { status: 404 });
  }

  await inngest.send({
    name: "availability/updated",
    data: { slotId, workerId, organisationId: auth.organisationId },
  });

  return Response.json({ slot });
}

export async function DELETE(request: Request, ctx: RouteContext): Promise<Response> {
  const auth = await getProviderAuth(request);
  if (!auth) return unauthorizedResponse();

  const { workerId, slotId } = await ctx.params;

  const deleted = await deleteAvailabilitySlot(slotId, auth.organisationId);
  if (!deleted) {
    return Response.json({ error: "Slot not found" }, { status: 404 });
  }

  await inngest.send({
    name: "availability/updated",
    data: { slotId, workerId, organisationId: auth.organisationId },
  });

  return Response.json({ success: true });
}
