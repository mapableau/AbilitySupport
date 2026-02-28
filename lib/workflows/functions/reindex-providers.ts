/**
 * lib/workflows/functions/reindex-providers.ts
 *
 * Inngest function: full or delta reindex of the providers collection
 * in Typesense. Triggered on a nightly cron and on provider update events.
 *
 * Steps:
 *   1. Fetch providers from Neon (optionally filtered by updated_since)
 *   2. Transform rows to Typesense document format
 *   3. Bulk upsert into the "providers" collection
 */

// TODO: uncomment once inngest + lib/db + lib/search are wired up
// import { inngest } from "../client";
//
// export const reindexProviders = inngest.createFunction(
//   { id: "reindex-providers", name: "Reindex Providers" },
//   [
//     { event: "search/reindex" },
//     { cron: "0 3 * * *" },  // nightly at 03:00 UTC
//   ],
//   async ({ event, step }) => {
//     const providers = await step.run("fetch-providers", async () => {
//       // const { db, providers } = await import("@/lib/db");
//       // return db.select().from(providers);
//       return [];
//     });
//
//     await step.run("upsert-typesense", async () => {
//       // const { upsertProviderDocuments } = await import("@/lib/search");
//       // await upsertProviderDocuments(providers);
//     });
//
//     return { indexed: providers.length };
//   }
// );

export {};
