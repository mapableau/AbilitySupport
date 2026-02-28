/**
 * lib/workflows/inngest/client.ts — Typed Inngest client singleton.
 *
 * A single Inngest instance shared by all workflow functions.
 * The generic parameter provides end-to-end type safety between
 * event senders and step function handlers.
 *
 * Environment:
 *   INNGEST_EVENT_KEY   — event ingestion key (set in Inngest dashboard)
 *   INNGEST_SIGNING_KEY — webhook verification key (optional, for prod)
 */

import { EventSchemas, Inngest } from "inngest";
import type { IndexingEvents } from "../events.js";

type AllEvents = IndexingEvents;

export const inngest = new Inngest({
  id: "mapable",
  schemas: new EventSchemas().fromRecord<AllEvents>(),
});
