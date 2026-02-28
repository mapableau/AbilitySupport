/**
 * lib/schemas/recommendation.ts — AI-generated provider/worker recommendations.
 *
 * A recommendation links a coordination request to a candidate
 * organisation + optional worker/vehicle. Each carries:
 *   - rank       (1 = best match)
 *   - score      (numeric similarity/fit score)
 *   - confidence (verified | likely | needs_verification)
 *   - reasoning  (LLM-generated explanation)
 *
 * Confidence levels:
 *   verified          — match factors confirmed by DB data (clearance OK,
 *                       availability confirmed, proximity calculated)
 *   likely            — most factors confirmed but some data is stale or
 *                       inferred (e.g. availability from weekly pattern)
 *   needs_verification — significant unknowns remain; coordinator should
 *                       call the provider before accepting
 */

import { z } from "zod";
import { uuidSchema } from "./common.js";
import {
  CONFIDENCE_LEVELS,
  RECOMMENDATION_STATUSES,
  SERVICE_TYPES,
  WORKER_CAPABILITIES,
} from "./enums.js";

// ── Match factor breakdown ─────────────────────────────────────────────────

/** Individual score components that explain why a candidate ranked here. */
export const matchFactorSchema = z.object({
  /** What was evaluated (e.g. "proximity", "availability", "clearance"). */
  factor: z.string().min(1),
  /** 0 – 1 normalised score for this factor. */
  score: z.number().min(0).max(1),
  /** Human-readable note ("12 km away", "available Mon–Fri 9–5"). */
  detail: z.string().max(500).optional(),
});

export type MatchFactor = z.infer<typeof matchFactorSchema>;

// ── Recommendation ─────────────────────────────────────────────────────────

export const recommendationSchema = z.object({
  id: uuidSchema,
  coordinationRequestId: uuidSchema,
  organisationId: uuidSchema,
  organisationName: z.string().optional(),
  workerId: uuidSchema.nullable().optional(),
  workerName: z.string().nullable().optional(),
  vehicleId: uuidSchema.nullable().optional(),

  /** 1 = best match. */
  rank: z.number().int().positive(),
  /** Composite fit score (0 – 100). */
  score: z.number().min(0).max(100),

  /**
   * How confident the system is that this recommendation is accurate.
   *
   *   verified          — all key factors confirmed by live DB data
   *   likely            — most factors confirmed, some inferred/stale
   *   needs_verification — significant unknowns; coordinator should verify
   */
  confidence: z.enum(CONFIDENCE_LEVELS),

  /** LLM-generated plain-English explanation of the ranking. */
  reasoning: z.string().max(2000).optional(),
  /** Granular breakdown of individual scoring factors. */
  matchFactors: z.array(matchFactorSchema).default([]),

  /** Service types this candidate covers from the request. */
  matchedServiceTypes: z.array(z.enum(SERVICE_TYPES)).default([]),
  /** Capabilities the matched worker brings. */
  matchedCapabilities: z.array(z.enum(WORKER_CAPABILITIES)).default([]),

  /** Distance from request location in km (null if not spatial). */
  distanceKm: z.number().nonnegative().nullable().optional(),

  status: z.enum(RECOMMENDATION_STATUSES),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Recommendation = z.infer<typeof recommendationSchema>;

// ── Create (internal — produced by matching engine, not user input) ────────

export const createRecommendationSchema = z.object({
  coordinationRequestId: uuidSchema,
  organisationId: uuidSchema,
  workerId: uuidSchema.optional(),
  vehicleId: uuidSchema.optional(),
  rank: z.number().int().positive(),
  score: z.number().min(0).max(100),
  confidence: z.enum(CONFIDENCE_LEVELS),
  reasoning: z.string().max(2000).optional(),
  matchFactors: z.array(matchFactorSchema).default([]),
  matchedServiceTypes: z.array(z.enum(SERVICE_TYPES)).default([]),
  matchedCapabilities: z.array(z.enum(WORKER_CAPABILITIES)).default([]),
  distanceKm: z.number().nonnegative().optional(),
});

export type CreateRecommendationInput = z.infer<
  typeof createRecommendationSchema
>;
