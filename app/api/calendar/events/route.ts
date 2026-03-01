/**
 * GET  /api/calendar/events?from=...&to=...&worker_id=...
 * POST /api/calendar/events — create a calendar event
 *
 * GET: returns calendar events in a time range. Filtered by RLS —
 *   participants see their own, workers see assigned, coordinators see all.
 * POST: creates a manual calendar event (block, hold, reminder).
 *   Bookings and availability events are created via their own workflows.
 */

import { calendarQuerySchema, createCalendarEventSchema } from "../../../../lib/schemas/calendar.js";
import { listCalendarEvents, createCalendarEvent } from "../../../../lib/calendar/data.js";
import {
  getAuthContext,
  unauthorizedResponse,
} from "../../../../lib/auth/index.js";

export async function GET(request: Request): Promise<Response> {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorizedResponse();

  const url = new URL(request.url);
  const parsed = calendarQuerySchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    workerId: url.searchParams.get("worker_id") || undefined,
    organisationId: url.searchParams.get("organisation_id") || undefined,
    participantProfileId: url.searchParams.get("participant_profile_id") || undefined,
    eventType: url.searchParams.get("event_type") || undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid query params. Required: from, to (ISO dates)", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const events = await listCalendarEvents(parsed.data);

  return Response.json({ events });
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

  const parsed = createCalendarEventSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const event = await createCalendarEvent(parsed.data);

  return Response.json({ event }, { status: 201 });
}
