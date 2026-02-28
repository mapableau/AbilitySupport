/**
 * lib/workflows/client.ts — Re-export Inngest client from canonical location.
 *
 * Kept for backwards compatibility. Prefer importing from
 * `@/lib/workflows/inngest/client` directly.
 */

export { inngest } from "./inngest/client.js";
