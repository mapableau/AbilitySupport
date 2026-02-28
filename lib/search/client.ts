/**
 * lib/search/client.ts — Typesense Cloud client singleton.
 *
 * Environment:
 *   TYPESENSE_HOST      — e.g. "xyz.a1.typesense.net"
 *   TYPESENSE_API_KEY   — admin API key (server-side only)
 *   TYPESENSE_SEARCH_KEY — scoped search-only key (safe for client)
 *   TYPESENSE_PORT      — defaults to 443
 *   TYPESENSE_PROTOCOL  — defaults to "https"
 */

// TODO: uncomment once typesense is installed
// import Typesense from "typesense";
//
// let client: Typesense.Client | null = null;
//
// export function getTypesenseClient(): Typesense.Client {
//   if (!client) {
//     client = new Typesense.Client({
//       nodes: [
//         {
//           host: process.env.TYPESENSE_HOST!,
//           port: Number(process.env.TYPESENSE_PORT ?? 443),
//           protocol: process.env.TYPESENSE_PROTOCOL ?? "https",
//         },
//       ],
//       apiKey: process.env.TYPESENSE_API_KEY!,
//       connectionTimeoutSeconds: 5,
//     });
//   }
//   return client;
// }

export {};
