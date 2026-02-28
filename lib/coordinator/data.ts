/**
 * lib/coordinator/data.ts — Data access for the coordinator review queue.
 *
 * Fetches queue items from two sources:
 *   1. coordination_requests with status = 'awaiting_review'
 *   2. recommendations with confidence = 'needs_verification' and status = 'pending'
 *
 * All functions are stubbed — wire to real Drizzle queries once
 * lib/db/schema.ts is updated.
 */

import type {
  QueuedRequest,
  QueuedRecommendation,
  QueueItem,
} from "./types.js";

// ── Queue fetching ─────────────────────────────────────────────────────────

export async function fetchRequestsAwaitingReview(): Promise<QueuedRequest[]> {
  // TODO: SELECT cr.*, pp.full_name as participant_name
  //   FROM coordination_requests cr
  //   JOIN participant_profiles pp ON cr.participant_profile_id = pp.id
  //   WHERE cr.status = 'awaiting_review'
  //   ORDER BY
  //     CASE cr.urgency WHEN 'emergency' THEN 0 WHEN 'urgent' THEN 1
  //       WHEN 'standard' THEN 2 ELSE 3 END,
  //     cr.created_at ASC
  console.log("[coordinator] fetchRequestsAwaitingReview — stub");
  return [];
}

export async function fetchRecommendationsNeedingVerification(): Promise<QueuedRecommendation[]> {
  // TODO: SELECT r.*, o.name as organisation_name, w.full_name as worker_name
  //   FROM recommendations r
  //   JOIN organisations o ON r.organisation_id = o.id
  //   LEFT JOIN workers w ON r.worker_id = w.id
  //   WHERE r.confidence = 'needs_verification' AND r.status = 'pending'
  //   ORDER BY r.created_at ASC
  console.log("[coordinator] fetchRecommendationsNeedingVerification — stub");
  return [];
}

export async function fetchQueue(): Promise<QueueItem[]> {
  const [requests, recs] = await Promise.all([
    fetchRequestsAwaitingReview(),
    fetchRecommendationsNeedingVerification(),
  ]);
  return [...requests, ...recs];
}

// ── Request actions ────────────────────────────────────────────────────────

export async function approveRequest(
  requestId: string,
  coordinatorId: string,
  notes?: string,
): Promise<boolean> {
  // TODO: UPDATE coordination_requests SET status = 'matching', updated_at = now()
  //   WHERE id = $1 AND status = 'awaiting_review'
  console.log(`[coordinator] approveRequest(${requestId}) by ${coordinatorId} — stub`);
  void notes;
  return true;
}

export async function addRequestNotes(
  requestId: string,
  coordinatorId: string,
  notes: string,
): Promise<boolean> {
  // TODO: UPDATE coordination_requests
  //   SET notes = COALESCE(notes, '') || E'\n---\n' || $3, updated_at = now()
  //   WHERE id = $1
  console.log(`[coordinator] addRequestNotes(${requestId}) by ${coordinatorId} — stub`);
  void notes;
  return true;
}

// ── Recommendation actions ─────────────────────────────────────────────────

export async function approveRecommendation(
  recommendationId: string,
  coordinatorId: string,
  notes?: string,
): Promise<boolean> {
  // TODO: UPDATE recommendations SET status = 'accepted', updated_at = now()
  //   WHERE id = $1 AND status = 'pending'
  console.log(`[coordinator] approveRecommendation(${recommendationId}) by ${coordinatorId} — stub`);
  void notes;
  return true;
}

export async function rejectRecommendation(
  recommendationId: string,
  coordinatorId: string,
  notes?: string,
): Promise<boolean> {
  // TODO: UPDATE recommendations SET status = 'rejected', updated_at = now()
  //   WHERE id = $1 AND status = 'pending'
  console.log(`[coordinator] rejectRecommendation(${recommendationId}) by ${coordinatorId} — stub`);
  void notes;
  return true;
}

// ── Verification follow-up ─────────────────────────────────────────────────

export async function createVerificationFollowup(
  recommendationId: string,
  coordinatorId: string,
  summary: string,
  details?: string,
): Promise<{ followupId: string; bookingId: string | null }> {
  // TODO:
  // 1. Look up the recommendation to find a linked booking (if any)
  // 2. INSERT INTO followups (booking_id, created_by, followup_type, status, priority, summary, details)
  //    VALUES ($bookingId, $coordinatorId, 'verification', 'open', 'high', $summary, $details)
  // 3. If no booking exists yet, create a placeholder or link to the coordination_request
  console.log(`[coordinator] createVerificationFollowup(rec=${recommendationId}) by ${coordinatorId} — stub`);
  return {
    followupId: crypto.randomUUID(),
    bookingId: null,
  };
}
