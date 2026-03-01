/**
 * lib/calendar/data.ts — Data access for calendar events and availability.
 *
 * Provides read endpoints for coordinators/participants and seed
 * helpers for populating availability from provider admin data.
 */

import type {
  CalendarQuery,
  CalendarEvent,
} from "../schemas/calendar.js";
import type { AvailabilitySlot } from "../schemas/availability.js";

// ── Calendar events ────────────────────────────────────────────────────────

export async function listCalendarEvents(
  query: CalendarQuery,
): Promise<CalendarEvent[]> {
  // TODO: SELECT * FROM calendar_events
  //   WHERE starts_at < $to AND ends_at > $from
  //   AND (worker_id = $workerId OR ...)
  //   ORDER BY starts_at ASC
  console.log(`[calendar] listCalendarEvents(${query.from.toISOString()} → ${query.to.toISOString()}) — stub`);
  return [];
}

export async function createCalendarEvent(
  input: Partial<CalendarEvent> & { eventType: string; sourceType: string; startsAt: Date; endsAt: Date; title: string },
): Promise<CalendarEvent> {
  // TODO: INSERT INTO calendar_events (...) VALUES (...) RETURNING *
  console.log(`[calendar] createCalendarEvent(${input.title}) — stub`);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    userId: input.userId ?? null,
    organisationId: input.organisationId ?? null,
    workerId: input.workerId ?? null,
    vehicleId: input.vehicleId ?? null,
    participantProfileId: input.participantProfileId ?? null,
    eventType: input.eventType,
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? null,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    allDay: input.allDay ?? false,
    recurrenceRule: input.recurrenceRule ?? null,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? "confirmed",
    color: input.color ?? null,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

// ── Availability (read-only, public-facing) ────────────────────────────────

export async function listAvailability(params: {
  workerId?: string;
  organisationId?: string;
  from: Date;
  to: Date;
}): Promise<AvailabilitySlot[]> {
  // TODO: SELECT * FROM availability_slots
  //   WHERE is_available = true
  //   AND starts_at < $to AND ends_at > $from
  //   AND (worker_id = $workerId OR worker_id IN (
  //     SELECT id FROM workers WHERE organisation_id = $organisationId
  //   ))
  //   ORDER BY starts_at ASC
  console.log(`[calendar] listAvailability(${params.from.toISOString()} → ${params.to.toISOString()}) — stub`);
  return [];
}

// ── Seed availability (bulk create from provider admin) ────────────────────

export async function seedAvailabilitySlots(
  slots: Array<{
    workerId?: string;
    vehicleId?: string;
    startsAt: Date;
    endsAt: Date;
    recurrenceRule?: string;
    notes?: string;
  }>,
): Promise<{ created: number }> {
  // TODO: INSERT INTO availability_slots (...) VALUES (...) RETURNING *
  // Also create corresponding calendar_events with source_type = 'availability_slot'
  console.log(`[calendar] seedAvailabilitySlots(${slots.length} slots) — stub`);
  return { created: slots.length };
}
