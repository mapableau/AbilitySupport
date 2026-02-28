/**
 * GET /api/recommendations?request_id=<uuid>
 *
 * Runs the recommendation pipeline for a coordination request:
 *   1. Loads the match spec from the coordination_requests table
 *   2. Searches Typesense for org + worker candidates
 *   3. Verifies hard constraints in Postgres (availability, vehicles, pool)
 *   4. Scores, ranks, and assigns confidence labels
 *   5. Groups results: combined (one org) vs split (care + transport)
 *   6. Persists recommendation rows (idempotent)
 *   7. Returns grouped results
 *
 * Query params:
 *   request_id (required) — UUID of the coordination_request
 *
 * Response:
 *   200 — GroupedRecommendations JSON
 *   400 — missing or invalid request_id
 *   404 — coordination request not found
 *   409 — request is in a terminal status (cancelled/completed)
 *   500 — pipeline error
 */

import {
  runRecommendationPipeline,
  PipelineError,
} from "../../../lib/recommendations/pipeline.js";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const requestId = url.searchParams.get("request_id");

  if (!requestId) {
    return Response.json(
      { error: "Missing required query parameter: request_id" },
      { status: 400 },
    );
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(requestId)) {
    return Response.json(
      { error: "request_id must be a valid UUID" },
      { status: 400 },
    );
  }

  try {
    const result = await runRecommendationPipeline(requestId);

    return Response.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (err instanceof PipelineError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        INVALID_STATUS: 409,
        SEARCH_FAILED: 502,
        VERIFY_FAILED: 502,
      };
      return Response.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] ?? 500 },
      );
    }

    console.error("[recommendations] Unexpected error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
