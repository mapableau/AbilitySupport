/**
 * lib/recommendations — Recommendation pipeline.
 *
 * Orchestrates Typesense search + Postgres verification to produce
 * scored, ranked recommendations grouped by fulfilment strategy.
 *
 * Usage:
 *   import { runRecommendationPipeline } from "@/lib/recommendations";
 */

export { runRecommendationPipeline, PipelineError } from "./pipeline.js";
export type {
  GroupedRecommendations,
  ScoredRecommendation,
  CoordinationRequestRow,
  LoadedRequest,
} from "./types.js";
