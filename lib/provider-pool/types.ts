/**
 * lib/provider-pool/types.ts — Row types for provider pool data access.
 *
 * Mirror the SQL tables from 0001_core.sql. Will be replaced by Drizzle
 * InferSelectModel types once lib/db/schema.ts is updated.
 */

export interface WorkerRow {
  id: string;
  user_id: string | null;
  organisation_id: string;
  full_name: string;
  worker_role: string;
  qualifications: unknown[];
  capabilities: string[];
  clearance_status: string;
  clearance_expiry: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySlotRow {
  id: string;
  worker_id: string | null;
  vehicle_id: string | null;
  starts_at: string;
  ends_at: string;
  recurrence_rule: string | null;
  is_available: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingRequestRow {
  id: string;
  coordination_request_id: string | null;
  participant_profile_id: string;
  participant_name: string;
  organisation_id: string;
  worker_id: string | null;
  worker_name: string | null;
  vehicle_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleRow {
  id: string;
  organisation_id: string;
  registration: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vehicle_type: string;
  wheelchair_accessible: boolean;
  capacity: number;
  active: boolean;
}
