/**
 * lib/recommendations/verify.ts — Postgres hard-constraint verification.
 *
 * After Typesense returns candidates, we verify in Postgres that:
 *   1. Workers/vehicles have availability slots covering the time window
 *   2. Vehicles are available if WAV is required
 *   3. The organisation is in the participant's allowed pool (if any)
 *
 * Each check returns a VerificationResult. Data-fetching functions are
 * stubbed with TODO markers — wire to real Drizzle queries once
 * lib/db/schema.ts is updated to match 0001_core.sql.
 */

import type { MatchSpec } from "../schemas/match-spec.js";
import type {
  OrgCandidate,
  WorkerCandidate,
  VerificationResult,
  VerifiedOrgCandidate,
  VerifiedWorkerCandidate,
} from "./types.js";

// ── Data access stubs ──────────────────────────────────────────────────────

async function checkWorkerAvailability(
  _workerId: string,
  _start: Date | undefined,
  _end: Date | undefined,
): Promise<boolean> {
  // TODO: query availability_slots table
  // SELECT 1 FROM availability_slots
  //   WHERE worker_id = $1 AND is_available = true
  //   AND starts_at <= $2 AND ends_at >= $3
  return true;
}

async function checkVehicleAvailability(
  _orgId: string,
  _requiresWav: boolean,
  _start: Date | undefined,
  _end: Date | undefined,
): Promise<boolean | null> {
  if (!_requiresWav) return null;
  // TODO: query vehicles + availability_slots
  // SELECT 1 FROM vehicles v
  //   JOIN availability_slots a ON a.vehicle_id = v.id
  //   WHERE v.organisation_id = $1 AND v.wheelchair_accessible = true
  //   AND v.active = true AND a.is_available = true
  //   AND a.starts_at <= $2 AND a.ends_at >= $3
  return true;
}

async function checkOrgPoolConstraint(
  _orgId: string,
  _participantProfileId: string,
): Promise<boolean> {
  // TODO: if the participant has a restricted provider pool, check membership
  // For now, all orgs are allowed
  return true;
}

async function checkWorkerClearance(
  _workerId: string,
): Promise<boolean> {
  // TODO: query workers table for clearance_status = 'cleared'
  // AND (clearance_expiry IS NULL OR clearance_expiry > now())
  return true;
}

// ── Verification logic ─────────────────────────────────────────────────────

async function verifyWorker(
  candidate: WorkerCandidate,
  spec: MatchSpec,
): Promise<VerifiedWorkerCandidate> {
  const unknowns: string[] = [];
  const start = spec.preferredStart;
  const end = spec.preferredEnd;

  const availabilityConfirmed = start && end
    ? await checkWorkerAvailability(candidate.doc.entity_id, start, end)
    : false;

  if (!start || !end) {
    unknowns.push("preferred_time_window_not_specified");
  }

  const clearanceCurrent = await checkWorkerClearance(candidate.doc.entity_id);
  if (!clearanceCurrent) {
    unknowns.push("worker_clearance_not_current");
  }

  return {
    ...candidate,
    verification: {
      availabilityConfirmed,
      vehicleAvailable: null,
      clearanceCurrent,
      orgPoolAllowed: true,
      unknowns,
    },
  };
}

export async function verifyOrgCandidate(
  candidate: OrgCandidate,
  workers: WorkerCandidate[],
  spec: MatchSpec,
): Promise<VerifiedOrgCandidate> {
  const unknowns: string[] = [];
  const requiresWav = spec.requirements?.wheelchairAccessible ?? false;
  const start = spec.preferredStart;
  const end = spec.preferredEnd;

  const vehicleAvailable = await checkVehicleAvailability(
    candidate.doc.entity_id,
    requiresWav,
    start,
    end,
  );

  if (requiresWav && vehicleAvailable === null) {
    unknowns.push("wav_availability_unknown");
  }

  const orgPoolAllowed = await checkOrgPoolConstraint(
    candidate.doc.entity_id,
    spec.participantProfileId,
  );

  if (!orgPoolAllowed) {
    unknowns.push("org_not_in_participant_pool");
  }

  const orgWorkers = workers.filter(
    (w) => w.doc.organisation_id === candidate.doc.entity_id,
  );

  const verifiedWorkers = await Promise.all(
    orgWorkers.map((w) => verifyWorker(w, spec)),
  );

  const anyWorkerAvailable = verifiedWorkers.some(
    (w) => w.verification.availabilityConfirmed,
  );

  if (!anyWorkerAvailable && verifiedWorkers.length > 0) {
    unknowns.push("no_worker_availability_confirmed");
  }

  return {
    ...candidate,
    verification: {
      availabilityConfirmed: anyWorkerAvailable,
      vehicleAvailable,
      clearanceCurrent: null,
      orgPoolAllowed,
      unknowns,
    },
    workers: verifiedWorkers,
  };
}

export async function verifyAllCandidates(
  orgs: OrgCandidate[],
  workers: WorkerCandidate[],
  spec: MatchSpec,
): Promise<VerifiedOrgCandidate[]> {
  return Promise.all(
    orgs.map((org) => verifyOrgCandidate(org, workers, spec)),
  );
}
