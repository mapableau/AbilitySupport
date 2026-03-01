/**
 * GET  /api/calendar/availability?from=...&to=...&worker_id=...&organisation_id=...
 * POST /api/calendar/availability — seed availability slots (bulk create)
 *
 * GET is public-facing (any authenticated user can query availability).
 * POST requires provider_admin or coordinator role.
 */

import { z } from "zod";
import { listAvailability, seedAvailabilitySlots } from "../../../../lib/calendar/data.js";
import {
  getAuthContext,
  requireRole,
  unauthorizedResponse,
} from "../../../../lib/auth/index.js";

const querySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  worker_id: z.string().uuid().optional(),
  organisation_id: z.string().uuid().optional(),
});

const seedItemSchema = z.object({
  workerId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  recurrenceRule: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

const seedSchema = z.object({
  slots: z.array(seedItemSchema).min(1).max(100),
});

export async function GET(request: Request): Promise<Response> {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorizedResponse();

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    worker_id: url.searchParams.get("worker_id") || undefined,
    organisation_id: url.searchParams.get("organisation_id") || undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid query params. Required: from, to (ISO dates)", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const slots = await listAvailability({
    from: parsed.data.from,
    to: parsed.data.to,
    workerId: parsed.data.worker_id,
    organisationId: parsed.data.organisation_id,
  });

  return Response.json({ slots });
}

export async function POST(request: Request): Promise<Response> {
  const guard = await requireRole(request, "admin", "coordinator", "provider_admin");
  if (guard instanceof Response) return guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = seedSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await seedAvailabilitySlots(parsed.data.slots);

  return Response.json({ success: true, created: result.created }, { status: 201 });
}
