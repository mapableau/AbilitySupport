/**
 * lib/workflows/functions — Re-exports all Inngest step functions.
 *
 * Used by the Next.js route handler (app/api/inngest/route.ts) to
 * register every function with Inngest's serve() helper.
 */

export { indexingFunctions } from "../indexing.js";
