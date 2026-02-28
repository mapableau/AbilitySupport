/**
 * lib/workflows — Inngest-powered background workflows.
 *
 * Exports the shared Inngest client, typed event definitions,
 * and all registered step functions.
 *
 * Usage:
 *   import { inngest } from "@/lib/workflows";              // send events
 *   import { functions } from "@/lib/workflows/functions";   // register in route
 */

export * from "./client";
export * from "./events";
