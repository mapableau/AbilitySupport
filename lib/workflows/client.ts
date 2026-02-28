/**
 * lib/workflows/client.ts — Inngest client singleton.
 *
 * A single Inngest instance is shared across all workflow functions.
 * The client ID should match the app name in the Inngest dashboard.
 *
 * Environment:
 *   INNGEST_EVENT_KEY    — event ingestion key
 *   INNGEST_SIGNING_KEY  — webhook signature verification key
 */

// TODO: uncomment once inngest is installed
// import { Inngest } from "inngest";
// import type { MapAbleEvents } from "./events";
//
// export const inngest = new Inngest({
//   id: "mapable",
//   schemas: new EventSchemas().fromRecord<MapAbleEvents>(),
// });

export {};
