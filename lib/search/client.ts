/**
 * lib/search/client.ts — Typesense Cloud client singleton.
 *
 * Uses env vars for connection config. The singleton survives Next.js HMR
 * via globalThis caching (same pattern as lib/db/client.ts).
 */

import { Client } from "typesense";

const globalForTs = globalThis as unknown as {
  __typesense_client: Client | undefined;
};

function createClient(): Client {
  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;
  if (!host || !apiKey) {
    throw new Error(
      "TYPESENSE_HOST and TYPESENSE_API_KEY must be set. " +
        "Copy .env.example → .env.local and fill them in.",
    );
  }

  return new Client({
    nodes: [
      {
        host,
        port: Number(process.env.TYPESENSE_PORT ?? 443),
        protocol: (process.env.TYPESENSE_PROTOCOL as "https" | "http") ?? "https",
      },
    ],
    apiKey,
    connectionTimeoutSeconds: 5,
  });
}

/** Server-side Typesense admin client (singleton). */
export function getTypesenseClient(): Client {
  if (!globalForTs.__typesense_client) {
    globalForTs.__typesense_client = createClient();
  }
  return globalForTs.__typesense_client;
}
