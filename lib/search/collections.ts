/**
 * lib/search/collections.ts — Typesense collection schema definitions.
 *
 * Each collection maps to a domain entity that needs full-text / geo search.
 * Schemas are declarative objects passed to Typesense's collection upsert API.
 *
 * Convention: keep collection names lowercase, snake_case, matching DB tables.
 */

// TODO: uncomment once typesense types are available
// import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";
//
// export const providersCollection: CollectionCreateSchema = {
//   name: "providers",
//   fields: [
//     { name: "id", type: "string" },
//     { name: "name", type: "string", sort: true },
//     { name: "abn", type: "string", optional: true },
//     { name: "service_types", type: "string[]", facet: true },
//     { name: "location", type: "geopoint" },       // [lat, lng]
//     { name: "updated_at", type: "int64", sort: true },
//   ],
//   default_sorting_field: "updated_at",
// };
//
// export const participantsCollection: CollectionCreateSchema = {
//   name: "participants",
//   fields: [
//     { name: "id", type: "string" },
//     { name: "full_name", type: "string", sort: true },
//     { name: "ndis_number", type: "string", optional: true },
//     { name: "active", type: "bool", facet: true },
//     { name: "updated_at", type: "int64", sort: true },
//   ],
//   default_sorting_field: "updated_at",
// };

export {};
