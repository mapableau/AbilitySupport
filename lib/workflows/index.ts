/**
 * lib/workflows — Inngest-powered background workflows.
 *
 * Exports the shared Inngest client, typed event definitions,
 * and all registered step functions.
 *
 * Usage:
 *   import { inngest } from "@/lib/workflows";
 *   import { indexingFunctions } from "@/lib/workflows/indexing";
 */

export * from "./client.js";
export * from "./events.js";
export * from "./indexing.js";
