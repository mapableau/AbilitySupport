/**
 * POST /api/recommendations/reorder — Re-rank recommendations in real time.
 *
 * Accepts existing recommendations + updated context (urgency, emotional
 * state, preferences) and returns a re-ranked list without running the
 * full search + verify pipeline. Only the context-sensitive scoring
 * factors are recalculated.
 *
 * Body: {
 *   recommendations: ScoredRecommendation[],
 *   updatedContext: {
 *     emotionalState, needsUrgency, functionalNeeds,
 *     continuityWorker, previousPositiveExperience
 *   },
 *   matchUrgency: string  // from the match spec
 * }
 *
 * Response: {
 *   recommendations: ScoredRecommendation[] (re-ranked),
 *   reorderedAt: ISO timestamp,
 *   changesApplied: string[]
 * }
 */

import { z } from "zod";
import { reorderRecommendations } from "../../../../lib/recommendations/reorder.js";
import {
  getAuthContext,
  unauthorizedResponse,
} from "../../../../lib/auth/index.js";

const dynamicRiskContextSchema = z.object({
  emotionalState: z.string().min(1),
  needsUrgency: z.string().min(1),
  functionalNeeds: z.array(z.string()).default([]),
  continuityWorker: z.boolean().default(false),
  previousPositiveExperience: z.boolean().default(false),
  outcomeHistory: z.object({
    completedBookings: z.number().int().nonnegative(),
    positiveRate: z.number().min(0).max(1),
  }).optional(),
});

const matchFactorSchema = z.object({
  factor: z.string(),
  score: z.number(),
  detail: z.string().optional(),
});

const scoreBreakdownSchema = z.object({
  baseMatch: z.number(),
  preferenceAlignment: z.number(),
  reliability: z.number(),
  urgencyBonus: z.number(),
  emotionalComfortBonus: z.number(),
  weights: z.record(z.string(), z.number()),
}).optional();

const scoredRecSchema = z.object({
  organisationId: z.string(),
  organisationName: z.string(),
  workerId: z.string().nullable(),
  workerName: z.string().nullable(),
  vehicleId: z.string().nullable(),
  rank: z.number(),
  score: z.number(),
  confidence: z.string(),
  matchFactors: z.array(matchFactorSchema),
  scoreBreakdown: scoreBreakdownSchema,
  matchedServiceTypes: z.array(z.string()),
  matchedCapabilities: z.array(z.string()),
  distanceKm: z.number().nullable(),
  reasoning: z.string(),
  unknowns: z.array(z.string()),
  evidenceRefs: z.array(z.string()),
});

const reorderSchema = z.object({
  recommendations: z.array(scoredRecSchema).min(1),
  updatedContext: dynamicRiskContextSchema,
  matchUrgency: z.string().default("standard"),
});

export async function POST(request: Request): Promise<Response> {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const start = performance.now();

  const result = reorderRecommendations({
    recommendations: parsed.data.recommendations as Parameters<typeof reorderRecommendations>[0]["recommendations"],
    updatedContext: parsed.data.updatedContext,
    matchUrgency: parsed.data.matchUrgency,
  });

  const durationMs = Math.round(performance.now() - start);

  return Response.json({
    ...result,
    meta: { durationMs },
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
