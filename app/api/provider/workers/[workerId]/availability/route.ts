/**
 * /api/provider/workers/[workerId]/availability — Availability slot CRUD.
 *
 * GET  — list slots for this worker
 * POST — create a new availability slot, emit availability/updated event
 */

import { createAvailabilitySlotSchema } from "../../../../../../lib/schemas/availability.js";
import {
  listAvailabilitySlots,
  createAvailabilitySlot,
  getWorker,
} from "../../../../../../lib/provider-pool/data.js";
import {
  getProviderAuth,
  unauthorizedResponse,
} from "../../../../../../lib/provider-pool/auth.js";
import { inngest } from "../../../../../../lib/workflows/inngest/client.js";

interface RouteContext {
  params: Promise<{ workerId: string }>;
}

export async function GET(request: Request, ctx: RouteContext): Promise<Response> {
  const auth = await getProviderAuth(request);
  if (!auth) return unauthorizedResponse();

  const { workerId } = await ctx.params;

  const worker = await getWorker(workerId, auth.organisationId);
  if (!worker) {
    return Response.json({ error: "Worker not found" }, { status: 404 });
  }

  const slots = await listAvailabilitySlots(workerId, auth.organisationId);
  return Response.json({ slots });
}

export async function POST(request: Request, ctx: RouteContext): Promise<Response> {
  const auth = await getProviderAuth(request);
  if (!auth) return unauthorizedResponse();

  const { workerId } = await ctx.params;

  const worker = await getWorker(workerId, auth.organisationId);
  if (!worker) {
    return Response.json({ error: "Worker not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createAvailabilitySlotSchema.safeParse({
    ...(body as Record<string, unknown>),
    workerId,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const slot = await createAvailabilitySlot(auth.organisationId, parsed.data);

  await inngest.send({
    name: "availability/updated",
    data: {
      slotId: slot.id,
      workerId,
      organisationId: auth.organisationId,
    },
  });

  return Response.json({ slot }, { status: 201 });
}
