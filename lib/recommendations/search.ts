/**
 * lib/recommendations/search.ts — Typesense search for matching candidates.
 *
 * Builds filter strings from a MatchSpec and queries both the
 * organisations_search and workers_search collections.
 */

import { getTypesenseClient } from "../search/client.js";
import type { MatchSpec } from "../schemas/match-spec.js";
import type {
  OrganisationSearchDoc,
  WorkerSearchDoc,
} from "../search/indexer/types.js";
import type { OrgCandidate, WorkerCandidate } from "./types.js";

const MAX_CANDIDATES = 50;

// ── Filter builder ─────────────────────────────────────────────────────────

function buildOrgFilters(spec: MatchSpec): string {
  const parts: string[] = ["active:true"];

  if (spec.requestType === "care") {
    parts.push("provides_care:true");
  } else if (spec.requestType === "transport") {
    parts.push("provides_transport:true");
  }

  if (spec.requirements?.wheelchairAccessible) {
    parts.push("wav_available:true");
  }
  if (spec.requirements?.verifiedOrganisationsOnly) {
    parts.push("verified:true");
  }
  if (spec.requirements?.requiredCapabilities?.includes("wheelchair_transfer")) {
    parts.push("has_transfer_assist:true");
  }
  if (spec.requirements?.requiredCapabilities?.includes("manual_handling")) {
    parts.push("has_manual_handling:true");
  }

  return parts.join(" && ");
}

function buildWorkerFilters(spec: MatchSpec): string {
  const parts: string[] = ["active:true", "clearance_current:true"];

  if (spec.requestType === "care") {
    parts.push("provides_care:true");
  } else if (spec.requestType === "transport") {
    parts.push("provides_transport:true");
  }

  const caps = spec.requirements?.requiredCapabilities ?? [];
  for (const cap of caps) {
    if (cap === "driving") parts.push("can_drive:true");
    else if (cap === "wheelchair_transfer") parts.push("has_wheelchair_transfer:true");
    else if (cap === "manual_handling") parts.push("has_manual_handling:true");
    else if (cap === "medication_administration") parts.push("has_medication_admin:true");
    else if (cap === "positive_behaviour_support") parts.push("has_positive_behaviour_support:true");
  }

  return parts.join(" && ");
}

function buildSortBy(spec: MatchSpec): string {
  if (spec.location) {
    return `location(${spec.location.lat}, ${spec.location.lng}):asc, reliability_score:desc`;
  }
  return "reliability_score:desc, updated_at:desc";
}

// ── Search executors ───────────────────────────────────────────────────────

export async function searchOrganisations(
  spec: MatchSpec,
): Promise<OrgCandidate[]> {
  const client = getTypesenseClient();

  const serviceAreaQuery = spec.location ? "*" : "*";
  const filterBy = buildOrgFilters(spec);
  const sortBy = buildSortBy(spec);

  const result = await client
    .collections<OrganisationSearchDoc>("organisations_search")
    .documents()
    .search({
      q: serviceAreaQuery,
      query_by: "name,service_area_tokens",
      filter_by: filterBy,
      sort_by: sortBy,
      per_page: MAX_CANDIDATES,
      ...(spec.location
        ? {
            geo_distance_field: "location",
            geo_distance_max: `${spec.maxDistanceKm ?? 25} km`,
          }
        : {}),
    } as Record<string, unknown>);

  return (result.hits ?? []).map((hit) => {
    const doc = hit.document as unknown as OrganisationSearchDoc;
    const raw = hit as unknown as Record<string, unknown>;
    const geoDistance = raw.geo_distance_meters;
    return {
      source: "typesense" as const,
      doc,
      textScore: typeof raw.text_match_info === "number" ? raw.text_match_info : 0,
      geoDistanceKm: typeof geoDistance === "number"
        ? geoDistance / 1000
        : null,
    };
  });
}

export async function searchWorkers(
  spec: MatchSpec,
): Promise<WorkerCandidate[]> {
  const client = getTypesenseClient();

  const filterBy = buildWorkerFilters(spec);
  const sortBy = buildSortBy(spec);

  const result = await client
    .collections<WorkerSearchDoc>("workers_search")
    .documents()
    .search({
      q: "*",
      query_by: "name,service_area_tokens",
      filter_by: filterBy,
      sort_by: sortBy,
      per_page: MAX_CANDIDATES,
    } as Record<string, unknown>);

  return (result.hits ?? []).map((hit) => {
    const doc = hit.document as unknown as WorkerSearchDoc;
    const raw = hit as unknown as Record<string, unknown>;
    const geoDistance = raw.geo_distance_meters;
    return {
      source: "typesense" as const,
      doc,
      textScore: 0,
      geoDistanceKm: typeof geoDistance === "number"
        ? geoDistance / 1000
        : null,
    };
  });
}
