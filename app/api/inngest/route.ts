/**
 * app/api/inngest/route.ts — Next.js App Router handler for Inngest.
 *
 * Serves all registered Inngest functions. Inngest's cloud service
 * sends webhooks to this endpoint to trigger step function execution.
 *
 * This route handles GET (introspection), POST (event delivery), and
 * PUT (function registration / sync).
 */

import { serve } from "inngest/next";
import { inngest } from "../../../lib/workflows/inngest/client.js";
import { indexingFunctions } from "../../../lib/workflows/indexing.js";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    ...indexingFunctions,
  ],
});
