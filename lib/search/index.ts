/**
 * lib/search — Typesense Cloud integration for full-text + geo search.
 *
 * Provides the client singleton, collection schemas, document builders,
 * and upsert helpers. Indexing is triggered by Inngest workflows.
 *
 * Usage:
 *   import { getTypesenseClient } from "@/lib/search";
 *   import { buildOrganisationDoc, upsertOrganisationDocs } from "@/lib/search/indexer";
 */

export * from "./client.js";
export * from "./collections.js";
