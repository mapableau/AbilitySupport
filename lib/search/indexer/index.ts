/**
 * lib/search/indexer — Document builders and upsert helpers.
 *
 * Pure-function builders transform Postgres rows into Typesense documents.
 * Upsert helpers push documents into Typesense collections.
 *
 * Usage:
 *   import { buildOrganisationDoc, upsertOrganisationDocs } from "@/lib/search/indexer";
 */

export * from "./types.js";
export { buildOrganisationDoc, type BuildOrgDocInput } from "./buildOrganisationDoc.js";
export { buildWorkerDoc, type BuildWorkerDocInput } from "./buildWorkerDoc.js";
export { upsertOrganisationDocs, upsertWorkerDocs, type UpsertResult } from "./upsert.js";
