/**
 * lib/search/indexer/buildOrganisationDoc.ts
 *
 * Pure function: takes a Postgres organisation row + aggregated worker/vehicle
 * data and produces a flat Typesense document ready for upsert.
 *
 * The caller is responsible for fetching from Postgres. This function has
 * zero side effects and is trivially unit-testable.
 */

import type {
  OrganisationRow,
  OrgVehicleSummary,
  OrganisationSearchDoc,
} from "./types.js";

export interface BuildOrgDocInput {
  row: OrganisationRow;
  /** Count of active, clearance-current workers. */
  activeWorkerCount: number;
  /** Aggregated vehicle info (WAV, types, count). */
  vehicles: OrgVehicleSummary;
  /** Aggregated capabilities across all active workers. */
  workerCapabilities: string[];
  /** Optional numeric reliability score (0–100). Defaults to 0. */
  reliabilityScore?: number;
}

/**
 * Build a Typesense document for the `organisations_search` collection.
 *
 * Capabilities are resolved into flattened booleans:
 *   - provides_care: org_type is "care" or "both"
 *   - provides_transport: org_type is "transport" or "both"
 *   - wav_available: at least one wheelchair-accessible vehicle
 *   - has_transfer_assist: any worker has "wheelchair_transfer" capability
 *   - has_manual_handling: any worker has "manual_handling" capability
 */
export function buildOrganisationDoc(input: BuildOrgDocInput): OrganisationSearchDoc {
  const { row, activeWorkerCount, vehicles, workerCapabilities, reliabilityScore } = input;

  const serviceAreaTokens = buildServiceAreaTokens(row.suburb, row.state, row.postcode);

  const location: [number, number] | null =
    row.lat != null && row.lng != null ? [row.lat, row.lng] : null;

  return {
    id: row.id,
    entity_id: row.id,
    entity_type: "organisation",
    name: row.name,
    abn: row.abn ?? "",
    org_type: row.org_type,
    service_types: row.service_types,
    service_area_tokens: serviceAreaTokens,
    location,
    provides_care: row.org_type === "care" || row.org_type === "both",
    provides_transport: row.org_type === "transport" || row.org_type === "both",
    wav_available: vehicles.wav_available,
    has_transfer_assist: workerCapabilities.includes("wheelchair_transfer"),
    has_manual_handling: workerCapabilities.includes("manual_handling"),
    total_vehicles: vehicles.total_vehicles,
    vehicle_types: vehicles.vehicle_types,
    verified: row.verified,
    active: row.active,
    worker_count: activeWorkerCount,
    reliability_score: reliabilityScore ?? 0,
    updated_at: Math.floor(row.updated_at.getTime() / 1000),
  };
}

/**
 * Build service area search tokens from address components.
 * Enables queries like "Parramatta NSW" or "2150" to match.
 */
function buildServiceAreaTokens(
  suburb: string | null,
  state: string | null,
  postcode: string | null,
): string[] {
  const tokens: string[] = [];
  if (suburb) tokens.push(suburb.toLowerCase());
  if (state) tokens.push(state.toUpperCase());
  if (postcode) tokens.push(postcode);
  if (suburb && state) tokens.push(`${suburb.toLowerCase()} ${state.toUpperCase()}`);
  return tokens;
}
