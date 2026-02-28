/**
 * lib/search/collections.ts — Typesense collection schema definitions.
 *
 * Each collection maps to a domain entity that needs full-text / geo search.
 * Schemas are declarative objects passed to the Typesense collection API.
 */

import type { CollectionFieldSchema } from "typesense/lib/Typesense/Collection.js";

export interface CollectionDef {
  name: string;
  fields: CollectionFieldSchema[];
  default_sorting_field: string;
}

// ── organisations_search ───────────────────────────────────────────────────

export const organisationsSearchCollection: CollectionDef = {
  name: "organisations_search",
  fields: [
    { name: "entity_id", type: "string" },
    { name: "entity_type", type: "string", facet: true },
    { name: "name", type: "string", sort: true },
    { name: "abn", type: "string", optional: true },
    { name: "org_type", type: "string", facet: true },
    { name: "service_types", type: "string[]", facet: true },
    { name: "service_area_tokens", type: "string[]", facet: true },
    { name: "location", type: "geopoint", optional: true },
    { name: "provides_care", type: "bool", facet: true },
    { name: "provides_transport", type: "bool", facet: true },
    { name: "wav_available", type: "bool", facet: true },
    { name: "has_transfer_assist", type: "bool", facet: true },
    { name: "has_manual_handling", type: "bool", facet: true },
    { name: "total_vehicles", type: "int32" },
    { name: "vehicle_types", type: "string[]", facet: true },
    { name: "verified", type: "bool", facet: true },
    { name: "active", type: "bool", facet: true },
    { name: "worker_count", type: "int32" },
    { name: "reliability_score", type: "int32", sort: true },
    { name: "updated_at", type: "int64", sort: true },
  ],
  default_sorting_field: "updated_at",
};

// ── workers_search ─────────────────────────────────────────────────────────

export const workersSearchCollection: CollectionDef = {
  name: "workers_search",
  fields: [
    { name: "entity_id", type: "string" },
    { name: "entity_type", type: "string", facet: true },
    { name: "name", type: "string", sort: true },
    { name: "organisation_id", type: "string", facet: true },
    { name: "organisation_name", type: "string" },
    { name: "worker_role", type: "string", facet: true },
    { name: "capabilities", type: "string[]", facet: true },
    { name: "service_area_tokens", type: "string[]", facet: true },
    { name: "location", type: "geopoint", optional: true },
    { name: "can_drive", type: "bool", facet: true },
    { name: "provides_care", type: "bool", facet: true },
    { name: "provides_transport", type: "bool", facet: true },
    { name: "has_transfer_assist", type: "bool", facet: true },
    { name: "has_manual_handling", type: "bool", facet: true },
    { name: "has_wheelchair_transfer", type: "bool", facet: true },
    { name: "has_medication_admin", type: "bool", facet: true },
    { name: "has_positive_behaviour_support", type: "bool", facet: true },
    { name: "has_aac", type: "bool", facet: true },
    { name: "clearance_status", type: "string", facet: true },
    { name: "clearance_current", type: "bool", facet: true },
    { name: "organisation_verified", type: "bool", facet: true },
    { name: "active", type: "bool", facet: true },
    { name: "reliability_score", type: "int32", sort: true },
    { name: "updated_at", type: "int64", sort: true },
  ],
  default_sorting_field: "updated_at",
};

export const ALL_COLLECTIONS: CollectionDef[] = [
  organisationsSearchCollection,
  workersSearchCollection,
];
