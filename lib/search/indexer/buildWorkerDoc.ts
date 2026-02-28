/**
 * lib/search/indexer/buildWorkerDoc.ts
 *
 * Pure function: takes a Postgres worker row (joined with org data and
 * capabilities) and produces a flat Typesense document ready for upsert.
 *
 * Capability flags are resolved into both an array (for faceting) and
 * flattened booleans (for fast boolean filtering). This covers the
 * "support worker who drives" case — can_drive is true when capabilities
 * include "driving" regardless of worker_role.
 */

import type {
  WorkerRowWithCapabilities,
  WorkerSearchDoc,
} from "./types.js";

export interface BuildWorkerDocInput {
  row: WorkerRowWithCapabilities;
  /** Geo centroid of the worker's organisation (fallback location). */
  orgLocation: { lat: number; lng: number } | null;
  /** Service area tokens inherited from the organisation's address. */
  orgServiceAreaTokens: string[];
  /** Optional numeric reliability score (0–100). Defaults to 0. */
  reliabilityScore?: number;
}

/**
 * Build a Typesense document for the `workers_search` collection.
 *
 * Capability flags resolved:
 *   - can_drive:       capabilities includes "driving"
 *   - provides_care:   has personal_care, community_access, or therapy_assistant
 *   - provides_transport: has driving capability
 *   - has_transfer_assist: has wheelchair_transfer
 *   - has_manual_handling: has manual_handling
 *   - has_wheelchair_transfer: same as transfer_assist (explicit alias)
 *   - has_medication_admin: has medication_administration
 *   - has_positive_behaviour_support: has positive_behaviour_support
 *   - has_aac: has augmentative/alternative communication (in capabilities)
 */
export function buildWorkerDoc(input: BuildWorkerDocInput): WorkerSearchDoc {
  const { row, orgLocation, orgServiceAreaTokens, reliabilityScore } = input;
  const caps = row.capabilities;

  const location: [number, number] | null =
    orgLocation ? [orgLocation.lat, orgLocation.lng] : null;

  const careCaps = ["personal_care", "community_access", "therapy_assistant"];

  return {
    id: row.id,
    entity_id: row.id,
    entity_type: "worker",
    name: row.full_name,
    organisation_id: row.organisation_id,
    organisation_name: row.organisation_name,
    worker_role: row.worker_role,
    capabilities: [...caps],
    service_area_tokens: orgServiceAreaTokens,
    location,
    can_drive: caps.includes("driving"),
    provides_care: careCaps.some((c) => caps.includes(c)),
    provides_transport: caps.includes("driving"),
    has_transfer_assist: caps.includes("wheelchair_transfer"),
    has_manual_handling: caps.includes("manual_handling"),
    has_wheelchair_transfer: caps.includes("wheelchair_transfer"),
    has_medication_admin: caps.includes("medication_administration"),
    has_positive_behaviour_support: caps.includes("positive_behaviour_support"),
    has_aac: caps.includes("aac"),
    clearance_status: row.clearance_status,
    clearance_current: row.clearance_status === "cleared",
    organisation_verified: row.organisation_verified,
    active: row.active,
    reliability_score: reliabilityScore ?? 0,
    updated_at: Math.floor(row.updated_at.getTime() / 1000),
  };
}
