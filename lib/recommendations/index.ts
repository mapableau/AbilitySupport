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
export { hydrateCard, hydrateCards } from "./hydrate.js";
export { SCORE_WEIGHTS } from "./score.js";
export type {
  GroupedRecommendations,
  ScoredRecommendation,
  DynamicRiskContext,
  ScoreBreakdown,
  CoordinationRequestRow,
  LoadedRequest,
} from "./types.js";
export type {
  RecommendationCard,
  CardOrganisation,
  CardWorker,
  CardVerification,
} from "./card.js";
