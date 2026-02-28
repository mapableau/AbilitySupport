/**
 * lib/search/indexer.ts — Typesense indexing helpers.
 *
 * Two indexing strategies:
 *   1. Full reindex  — used by the nightly Inngest cron workflow
 *   2. Delta upsert  — used after individual DB writes (webhook or event)
 *
 * Both are designed to be called from Inngest step functions so they
 * get automatic retries and observability for free.
 */

// TODO: uncomment once typesense + drizzle are wired up
// import { getTypesenseClient } from "./client";
//
// export async function upsertProviderDocuments(
//   docs: Record<string, unknown>[]
// ): Promise<void> {
//   const client = getTypesenseClient();
//   await client
//     .collections("providers")
//     .documents()
//     .import(docs, { action: "upsert" });
// }
//
// export async function upsertParticipantDocuments(
//   docs: Record<string, unknown>[]
// ): Promise<void> {
//   const client = getTypesenseClient();
//   await client
//     .collections("participants")
//     .documents()
//     .import(docs, { action: "upsert" });
// }

export {};
