/**
 * lib/provider-pool/data.ts — Data access functions for provider pool management.
 *
 * All functions are async and accept explicit IDs so they can be used from
 * API routes with auth-derived organisationId. Data-fetching is stubbed
 * with TODO markers — replace with real Drizzle queries once lib/db/schema.ts
 * is updated to match 0001_core.sql.
 */

import type {
  WorkerRow,
  AvailabilitySlotRow,
  BookingRequestRow,
  VehicleRow,
} from "./types.js";
import type { CreateWorkerInput, UpdateWorkerInput } from "../schemas/worker.js";
import type {
  CreateAvailabilitySlotInput,
  UpdateAvailabilitySlotInput,
} from "../schemas/availability.js";

// ═══════════════════════════════════════════════════════════════════════════
// Workers
// ═══════════════════════════════════════════════════════════════════════════

export async function listWorkers(organisationId: string): Promise<WorkerRow[]> {
  // TODO: SELECT * FROM workers WHERE organisation_id = $1 ORDER BY full_name
  console.log(`[provider-pool] listWorkers(${organisationId}) — stub`);
  return [];
}

export async function getWorker(
  workerId: string,
  organisationId: string,
): Promise<WorkerRow | null> {
  // TODO: SELECT * FROM workers WHERE id = $1 AND organisation_id = $2
  console.log(`[provider-pool] getWorker(${workerId}, ${organisationId}) — stub`);
  return null;
}

export async function createWorker(
  organisationId: string,
  input: CreateWorkerInput,
): Promise<WorkerRow> {
  // TODO: INSERT INTO workers (...) VALUES (...) RETURNING *
  console.log(`[provider-pool] createWorker(${organisationId}) — stub`);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    user_id: input.userId ?? null,
    organisation_id: organisationId,
    full_name: input.fullName,
    worker_role: input.workerRole ?? "support_worker",
    qualifications: input.qualifications ?? [],
    capabilities: input.capabilities ?? [],
    clearance_status: input.clearanceStatus ?? "pending",
    clearance_expiry: input.clearanceExpiry?.toISOString() ?? null,
    active: true,
    created_at: now,
    updated_at: now,
  };
}

export async function updateWorker(
  workerId: string,
  organisationId: string,
  input: UpdateWorkerInput,
): Promise<WorkerRow | null> {
  // TODO: UPDATE workers SET ... WHERE id = $1 AND organisation_id = $2 RETURNING *
  console.log(`[provider-pool] updateWorker(${workerId}, ${organisationId}) — stub`);
  const existing = await getWorker(workerId, organisationId);
  if (!existing) return null;
  return {
    ...existing,
    full_name: input.fullName ?? existing.full_name,
    worker_role: input.workerRole ?? existing.worker_role,
    capabilities: input.capabilities ?? existing.capabilities,
    clearance_status: input.clearanceStatus ?? existing.clearance_status,
    updated_at: new Date().toISOString(),
  };
}

export async function deleteWorker(
  workerId: string,
  organisationId: string,
): Promise<boolean> {
  // TODO: UPDATE workers SET active = false WHERE id = $1 AND organisation_id = $2
  console.log(`[provider-pool] deleteWorker(${workerId}, ${organisationId}) — stub`);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Availability Slots
// ═══════════════════════════════════════════════════════════════════════════

export async function listAvailabilitySlots(
  workerId: string,
  organisationId: string,
): Promise<AvailabilitySlotRow[]> {
  // TODO: SELECT a.* FROM availability_slots a
  //   JOIN workers w ON a.worker_id = w.id
  //   WHERE a.worker_id = $1 AND w.organisation_id = $2
  //   ORDER BY a.starts_at
  console.log(`[provider-pool] listAvailabilitySlots(${workerId}, ${organisationId}) — stub`);
  return [];
}

export async function createAvailabilitySlot(
  organisationId: string,
  input: CreateAvailabilitySlotInput,
): Promise<AvailabilitySlotRow> {
  // TODO: verify worker belongs to org, then INSERT
  console.log(`[provider-pool] createAvailabilitySlot(${organisationId}) — stub`);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    worker_id: input.workerId ?? null,
    vehicle_id: input.vehicleId ?? null,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt.toISOString(),
    recurrence_rule: input.recurrenceRule ?? null,
    is_available: input.isAvailable ?? true,
    notes: input.notes ?? null,
    created_at: now,
    updated_at: now,
  };
}

export async function updateAvailabilitySlot(
  slotId: string,
  organisationId: string,
  input: UpdateAvailabilitySlotInput,
): Promise<AvailabilitySlotRow | null> {
  // TODO: UPDATE availability_slots SET ... WHERE id = $1
  //   AND worker_id IN (SELECT id FROM workers WHERE organisation_id = $2)
  console.log(`[provider-pool] updateAvailabilitySlot(${slotId}, ${organisationId}) — stub`);
  return null;
}

export async function deleteAvailabilitySlot(
  slotId: string,
  organisationId: string,
): Promise<boolean> {
  // TODO: DELETE FROM availability_slots WHERE id = $1
  //   AND worker_id IN (SELECT id FROM workers WHERE organisation_id = $2)
  console.log(`[provider-pool] deleteAvailabilitySlot(${slotId}, ${organisationId}) — stub`);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Incoming Booking Requests
// ═══════════════════════════════════════════════════════════════════════════

export async function listIncomingRequests(
  organisationId: string,
): Promise<BookingRequestRow[]> {
  // TODO: SELECT b.*, pp.full_name as participant_name, w.full_name as worker_name
  //   FROM bookings b
  //   JOIN participant_profiles pp ON b.participant_profile_id = pp.id
  //   LEFT JOIN workers w ON b.worker_id = w.id
  //   WHERE b.organisation_id = $1 AND b.status IN ('pending', 'confirmed')
  //   ORDER BY b.starts_at ASC
  console.log(`[provider-pool] listIncomingRequests(${organisationId}) — stub`);
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// Vehicles (read-only for worker linking)
// ═══════════════════════════════════════════════════════════════════════════

export async function listVehicles(organisationId: string): Promise<VehicleRow[]> {
  // TODO: SELECT * FROM vehicles WHERE organisation_id = $1 AND active = true
  console.log(`[provider-pool] listVehicles(${organisationId}) — stub`);
  return [];
}
