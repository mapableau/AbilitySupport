/**
 * lib/followups/data.ts — Data access for post-service follow-ups.
 *
 * Stubbed with TODO markers — wire to real Drizzle queries once
 * lib/db/schema.ts is updated.
 */

import type { BookingRow, FollowupRow } from "./types.js";

export async function getBooking(bookingId: string): Promise<BookingRow | null> {
  // TODO: SELECT * FROM bookings WHERE id = $1
  console.log(`[followups] getBooking(${bookingId}) — stub`);
  return null;
}

export async function createFollowup(params: {
  bookingId: string;
  createdBy: string;
  followupType: string;
  priority: string;
  summary: string;
  details?: string;
}): Promise<FollowupRow> {
  // TODO: INSERT INTO followups (...) VALUES (...) RETURNING *
  console.log(`[followups] createFollowup(booking=${params.bookingId}) — stub`);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    bookingId: params.bookingId,
    createdBy: params.createdBy,
    followupType: params.followupType,
    status: "open",
    priority: params.priority,
    summary: params.summary,
    details: params.details ?? null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getFollowup(followupId: string): Promise<FollowupRow | null> {
  // TODO: SELECT * FROM followups WHERE id = $1
  console.log(`[followups] getFollowup(${followupId}) — stub`);
  return null;
}

export async function updateFollowupStatus(
  followupId: string,
  status: string,
  details?: string,
): Promise<boolean> {
  // TODO: UPDATE followups SET status = $2, details = ..., updated_at = now() WHERE id = $1
  console.log(`[followups] updateFollowupStatus(${followupId}, ${status}) — stub`);
  void details;
  return true;
}

/**
 * Create an escalation followup for a coordinator to review.
 * Links to the same booking as the original followup.
 */
export async function createEscalation(params: {
  bookingId: string;
  coordinatorSystemUserId: string;
  summary: string;
  details: string;
  priority: string;
}): Promise<FollowupRow> {
  // TODO: INSERT INTO followups (booking_id, created_by, followup_type, status, priority, summary, details)
  //   VALUES ($1, $2, 'incident_report', 'escalated', $5, $4, $3)
  console.log(`[followups] createEscalation(booking=${params.bookingId}) — stub`);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    bookingId: params.bookingId,
    createdBy: params.coordinatorSystemUserId,
    followupType: "incident_report",
    status: "escalated",
    priority: params.priority,
    summary: params.summary,
    details: params.details,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Lower the reliability score on a recommendation's org/worker.
 * Does NOT suspend — just decrements the score so future rankings
 * are affected.
 */
export async function lowerProviderConfidence(params: {
  organisationId: string;
  workerId?: string;
  reason: string;
  decrement: number;
}): Promise<void> {
  // TODO: UPDATE organisations SET reliability_score = GREATEST(0, reliability_score - $4)
  //   WHERE id = $1
  // If workerId: UPDATE workers SET ... (or a separate scores table)
  console.log(
    `[followups] lowerProviderConfidence(org=${params.organisationId}, ` +
    `worker=${params.workerId ?? "n/a"}, by=${params.decrement}) — stub`,
  );
}

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export function getSystemUserId(): string {
  return SYSTEM_USER_ID;
}
