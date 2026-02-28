/**
 * lib/search — Typesense Cloud integration for full-text + geo search.
 *
 * Provides the client singleton, collection schemas, and indexing helpers.
 * Indexing is triggered by Inngest workflows (lib/workflows).
 *
 * Usage:
 *   import { getTypesenseClient } from "@/lib/search";
 */

export * from "./client";
export * from "./collections";
export * from "./indexer";
