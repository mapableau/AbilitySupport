/**
 * lib/search/indexer/upsert.ts — Typesense bulk upsert helpers.
 *
 * Generic upsert function plus typed wrappers for each collection.
 * Designed to be called from Inngest step functions (automatic retries).
 */

import { getTypesenseClient } from "../client.js";
import type { OrganisationSearchDoc, WorkerSearchDoc } from "./types.js";

/** Result of a bulk import — Typesense returns one status per document. */
export interface UpsertResult {
  total: number;
  success: number;
  errors: Array<{ document: string; error: string }>;
}

/**
 * Upsert an array of documents into a Typesense collection.
 *
 * Uses the Typesense bulk import API with `action: "upsert"` —
 * existing documents (matched by `id`) are replaced, new ones inserted.
 */
async function upsertDocs(
  collectionName: string,
  docs: Record<string, unknown>[],
): Promise<UpsertResult> {
  if (docs.length === 0) {
    return { total: 0, success: 0, errors: [] };
  }

  const client = getTypesenseClient();
  const results = await client
    .collections(collectionName)
    .documents()
    .import(docs, { action: "upsert" });

  const errors: Array<{ document: string; error: string }> = [];
  let success = 0;

  for (const r of results) {
    if (r.success) {
      success++;
    } else {
      errors.push({
        document: (r as unknown as Record<string, string>).document ?? "unknown",
        error: r.error ?? "Unknown error",
      });
    }
  }

  return { total: docs.length, success, errors };
}

/** Upsert organisation documents into the `organisations_search` collection. */
export async function upsertOrganisationDocs(
  docs: OrganisationSearchDoc[],
): Promise<UpsertResult> {
  return upsertDocs(
    "organisations_search",
    docs as unknown as Record<string, unknown>[],
  );
}

/** Upsert worker documents into the `workers_search` collection. */
export async function upsertWorkerDocs(
  docs: WorkerSearchDoc[],
): Promise<UpsertResult> {
  return upsertDocs(
    "workers_search",
    docs as unknown as Record<string, unknown>[],
  );
}
