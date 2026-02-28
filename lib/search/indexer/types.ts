/**
 * lib/search/indexer/types.ts — Shared types for search document builders.
 *
 * Row types mirror the SQL tables from 0001_core.sql. They exist here
 * (rather than importing from Drizzle schema) because the Drizzle
 * schema.ts hasn't been updated to match the production migration yet.
 * Once it is, these can be replaced with Drizzle InferSelectModel types.
 */

// ── Organisation row (from organisations table) ────────────────────────────

export interface OrganisationRow {
  id: string;
  name: string;
  abn: string | null;
  org_type: string;
  service_types: string[];
  lat: number | null;
  lng: number | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  verified: boolean;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ── Worker row (from workers table, joined with organisation) ──────────────

export interface WorkerRow {
  id: string;
  user_id: string | null;
  organisation_id: string;
  organisation_name: string;
  organisation_verified: boolean;
  full_name: string;
  worker_role: string;
  qualifications: unknown[];
  clearance_status: string;
  clearance_expiry: Date | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Worker capabilities are stored as a jsonb array on the workers table
 * in the Zod/app layer, but the SQL migration stores them inside the
 * qualifications jsonb. This separate array is expected to be derived
 * by the caller (e.g. from a capabilities join table or parsed from
 * qualifications jsonb).
 */
export interface WorkerRowWithCapabilities extends WorkerRow {
  capabilities: string[];
}

// ── Aggregated vehicle info for an organisation ────────────────────────────

export interface OrgVehicleSummary {
  total_vehicles: number;
  wav_available: boolean;
  vehicle_types: string[];
}

// ── Typesense document shapes ──────────────────────────────────────────────

export interface OrganisationSearchDoc {
  id: string;
  entity_id: string;
  entity_type: "organisation";
  name: string;
  abn: string;
  org_type: string;
  service_types: string[];
  service_area_tokens: string[];
  location: [number, number] | null;
  provides_care: boolean;
  provides_transport: boolean;
  wav_available: boolean;
  has_transfer_assist: boolean;
  has_manual_handling: boolean;
  total_vehicles: number;
  vehicle_types: string[];
  verified: boolean;
  active: boolean;
  worker_count: number;
  reliability_score: number;
  updated_at: number;
}

export interface WorkerSearchDoc {
  id: string;
  entity_id: string;
  entity_type: "worker";
  name: string;
  organisation_id: string;
  organisation_name: string;
  worker_role: string;
  capabilities: string[];
  service_area_tokens: string[];
  location: [number, number] | null;
  can_drive: boolean;
  provides_care: boolean;
  provides_transport: boolean;
  has_transfer_assist: boolean;
  has_manual_handling: boolean;
  has_wheelchair_transfer: boolean;
  has_medication_admin: boolean;
  has_positive_behaviour_support: boolean;
  has_aac: boolean;
  clearance_status: string;
  clearance_current: boolean;
  organisation_verified: boolean;
  active: boolean;
  reliability_score: number;
  updated_at: number;
}
