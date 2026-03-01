/**
 * lib/recommendations/score.ts — Weighted scoring with dynamic context.
 *
 * Scoring formula:
 *   score = base_match
 *         + preference_alignment * 0.4
 *         + reliability * 0.3
 *         + urgency_bonus * 0.2
 *         + emotional_comfort_bonus * 0.1
 *
 * Each component produces a 0–1 normalised sub-score. The final score
 * is 0–100 and the breakdown is returned for transparency.
 */

import type { MatchSpec } from "../schemas/match-spec.js";
import type { ConfidenceLevel } from "../schemas/enums.js";
import type { MatchFactor } from "../schemas/recommendation.js";
import type { VerifiedOrgCandidate, ScoredRecommendation, DynamicRiskContext } from "./types.js";

// ── Formula weights ────────────────────────────────────────────────────────

export const SCORE_WEIGHTS = {
  baseMatch: 1.0,
  preferenceAlignment: 0.4,
  reliability: 0.3,
  urgencyBonus: 0.2,
  emotionalComfortBonus: 0.1,
} as const;

const TOTAL_WEIGHT =
  SCORE_WEIGHTS.baseMatch +
  SCORE_WEIGHTS.preferenceAlignment +
  SCORE_WEIGHTS.reliability +
  SCORE_WEIGHTS.urgencyBonus +
  SCORE_WEIGHTS.emotionalComfortBonus;

// ── Factor calculators ─────────────────────────────────────────────────────

export function proximityFactor(distanceKm: number | null, maxKm: number): MatchFactor {
  if (distanceKm === null) {
    return { factor: "proximity", score: 0.5, detail: "Location not available" };
  }
  const normalized = Math.max(0, 1 - distanceKm / maxKm);
  return {
    factor: "proximity",
    score: round(normalized),
    detail: `${distanceKm.toFixed(1)} km away`,
  };
}

export function capabilityFactor(
  candidateCaps: string[],
  requiredCaps: string[],
  candidateServiceTypes: string[],
  requiredServiceTypes: string[],
): MatchFactor {
  if (requiredCaps.length === 0 && requiredServiceTypes.length === 0) {
    return { factor: "capability_match", score: 1, detail: "No specific capabilities required" };
  }
  const capHits = requiredCaps.filter((c) => candidateCaps.includes(c)).length;
  const svcHits = requiredServiceTypes.filter((s) => candidateServiceTypes.includes(s)).length;
  const total = requiredCaps.length + requiredServiceTypes.length;
  const score = total > 0 ? (capHits + svcHits) / total : 1;
  const missing = [
    ...requiredCaps.filter((c) => !candidateCaps.includes(c)),
    ...requiredServiceTypes.filter((s) => !candidateServiceTypes.includes(s)),
  ];
  return {
    factor: "capability_match",
    score: round(score),
    detail: missing.length > 0 ? `Missing: ${missing.join(", ")}` : "All capabilities matched",
  };
}

export function availabilityFactor(confirmed: boolean): MatchFactor {
  return {
    factor: "availability",
    score: confirmed ? 1 : 0.3,
    detail: confirmed ? "Availability confirmed" : "Availability not confirmed",
  };
}

export function verificationFactor(verified: boolean, orgPoolAllowed: boolean): MatchFactor {
  const score = verified && orgPoolAllowed ? 1 : verified ? 0.7 : 0.4;
  const detail = !orgPoolAllowed
    ? "Not in participant's provider pool"
    : verified ? "Organisation verified" : "Organisation not yet verified";
  return { factor: "verification_status", score, detail };
}

export function reliabilityFactor(reliabilityScore: number, outcomeHistory?: { completedBookings: number; positiveRate: number }): MatchFactor {
  let score = Math.min(1, reliabilityScore / 100);
  let detail = `Base reliability: ${reliabilityScore}/100`;
  if (outcomeHistory && outcomeHistory.completedBookings > 0) {
    const historyBoost = outcomeHistory.positiveRate * 0.3;
    score = Math.min(1, score * 0.7 + historyBoost + 0.15);
    detail += ` · ${outcomeHistory.completedBookings} bookings (${Math.round(outcomeHistory.positiveRate * 100)}% positive)`;
  }
  return { factor: "reliability", score: round(score), detail };
}

export function preferenceAlignmentFactor(
  candidateCaps: string[],
  functionalNeeds: string[],
  sensorySupport: boolean,
  continuityWorker: boolean,
): MatchFactor {
  if (functionalNeeds.length === 0 && !sensorySupport && !continuityWorker) {
    return { factor: "preference_alignment", score: 0.7, detail: "No specific preferences expressed" };
  }
  let hits = 0;
  let total = 0;
  if (functionalNeeds.length > 0) {
    const needsAsCaps = functionalNeeds.filter((n) => candidateCaps.includes(n));
    hits += needsAsCaps.length;
    total += functionalNeeds.length;
  }
  if (sensorySupport) {
    total++;
    if (candidateCaps.includes("sensory_support") || candidateCaps.includes("aac")) hits++;
  }
  if (continuityWorker) {
    total++;
    hits++;
  }
  const score = total > 0 ? hits / total : 0.7;
  const pct = Math.round(score * 100);
  return {
    factor: "preference_alignment",
    score: round(score),
    detail: `${pct}% of preferences matched${continuityWorker ? " (continuity worker)" : ""}`,
  };
}

export function urgencyBonusFactor(
  matchUrgency: string,
  needsUrgency: string,
  availabilityConfirmed: boolean,
): MatchFactor {
  let score = 0.5;
  const parts: string[] = [];
  if (matchUrgency === "urgent" || matchUrgency === "emergency" || needsUrgency === "urgent" || needsUrgency === "soon") {
    score = availabilityConfirmed ? 1.0 : 0.3;
    parts.push(availabilityConfirmed ? "Urgent + available" : "Urgent but availability unconfirmed");
  } else if (matchUrgency === "standard" || needsUrgency === "soon") {
    score = availabilityConfirmed ? 0.8 : 0.5;
    parts.push("Standard urgency");
  } else {
    score = 0.6;
    parts.push("Flexible timing");
  }
  return {
    factor: "urgency_bonus",
    score: round(score),
    detail: parts.join("; ") || "Default urgency",
  };
}

export function emotionalComfortFactor(
  emotionalState: string,
  workerCanDrive: boolean,
  hasPositiveBehaviourSupport: boolean,
  previousPositiveExperience: boolean,
): MatchFactor {
  let score = 0.5;
  const parts: string[] = [];
  const stressed = ["anxious", "distressed", "stressed", "overwhelmed", "agitated"].includes(emotionalState);

  if (stressed) {
    if (previousPositiveExperience) { score += 0.3; parts.push("Previous positive experience"); }
    if (hasPositiveBehaviourSupport) { score += 0.15; parts.push("PBS capability"); }
    if (workerCanDrive) { score += 0.05; parts.push("Can drive (fewer transitions)"); }
  } else {
    score = 0.7;
    parts.push("Participant calm");
    if (previousPositiveExperience) { score += 0.2; parts.push("Familiar provider"); }
  }
  return {
    factor: "emotional_comfort",
    score: round(Math.min(1, score)),
    detail: parts.join("; ") || "Default comfort",
  };
}

// ── Confidence assignment ──────────────────────────────────────────────────

function assignConfidence(
  verification: { availabilityConfirmed: boolean; vehicleAvailable: boolean | null; clearanceCurrent: boolean | null; unknowns: string[] },
  orgVerified: boolean,
): ConfidenceLevel {
  if (verification.unknowns.length > 0) return "needs_verification";
  if (!verification.availabilityConfirmed) return "needs_verification";
  if (verification.vehicleAvailable === false) return "needs_verification";
  if (verification.clearanceCurrent === false) return "needs_verification";
  if (!orgVerified) return "likely";
  return "verified";
}

// ── Reasoning builder ──────────────────────────────────────────────────────

function buildReasoning(factors: MatchFactor[], confidence: ConfidenceLevel): string {
  const topFactors = factors
    .filter((f) => f.score >= 0.7 && f.detail)
    .map((f) => f.detail)
    .slice(0, 4)
    .join(". ");
  const weakFactors = factors
    .filter((f) => f.score < 0.5 && f.detail)
    .map((f) => `⚠ ${f.factor}: ${f.detail}`)
    .join(". ");
  const confidenceNote = confidence === "verified"
    ? "All key constraints verified."
    : confidence === "likely"
      ? "Most constraints verified; organisation awaiting full verification."
      : "Some constraints could not be verified — coordinator should confirm.";
  const parts = [topFactors, weakFactors, confidenceNote].filter(Boolean);
  return parts.join(". ");
}

// ── Score a single candidate ───────────────────────────────────────────────

export function scoreOrgCandidate(
  candidate: VerifiedOrgCandidate,
  spec: MatchSpec,
  dynamicCtx?: DynamicRiskContext,
): ScoredRecommendation {
  const maxKm = spec.maxDistanceKm ?? 25;
  const requiredCaps = spec.requirements?.requiredCapabilities ?? [];
  const requiredSvcs = spec.serviceTypes ?? [];

  const bestWorker = candidate.workers.length > 0
    ? candidate.workers.reduce((best, w) =>
        (w.verification.availabilityConfirmed && !best.verification.availabilityConfirmed)
          ? w : best,
      )
    : null;

  const allOrgCaps = [...new Set(candidate.workers.flatMap((w) => w.doc.capabilities))];

  const baseFactors: MatchFactor[] = [
    proximityFactor(candidate.geoDistanceKm, maxKm),
    capabilityFactor(allOrgCaps, requiredCaps as string[], candidate.doc.service_types, requiredSvcs as string[]),
    availabilityFactor(candidate.verification.availabilityConfirmed),
    verificationFactor(candidate.doc.verified, candidate.verification.orgPoolAllowed),
  ];

  const baseMatch = baseFactors.reduce((sum, f) => sum + f.score, 0) / baseFactors.length;

  const prefFactor = preferenceAlignmentFactor(
    allOrgCaps,
    dynamicCtx?.functionalNeeds ?? [],
    (dynamicCtx?.functionalNeeds ?? []).includes("sensory_support"),
    dynamicCtx?.continuityWorker ?? false,
  );

  const relFactor = reliabilityFactor(
    candidate.doc.reliability_score,
    dynamicCtx?.outcomeHistory,
  );

  const urgFactor = urgencyBonusFactor(
    spec.urgency ?? "standard",
    dynamicCtx?.needsUrgency ?? "routine",
    candidate.verification.availabilityConfirmed,
  );

  const emoFactor = emotionalComfortFactor(
    dynamicCtx?.emotionalState ?? "calm",
    bestWorker?.doc.can_drive ?? false,
    allOrgCaps.includes("positive_behaviour_support"),
    dynamicCtx?.previousPositiveExperience ?? false,
  );

  const weightedScore = (
    baseMatch * SCORE_WEIGHTS.baseMatch +
    prefFactor.score * SCORE_WEIGHTS.preferenceAlignment +
    relFactor.score * SCORE_WEIGHTS.reliability +
    urgFactor.score * SCORE_WEIGHTS.urgencyBonus +
    emoFactor.score * SCORE_WEIGHTS.emotionalComfortBonus
  ) / TOTAL_WEIGHT * 100;

  const allFactors = [...baseFactors, prefFactor, relFactor, urgFactor, emoFactor];
  const confidence = assignConfidence(candidate.verification, candidate.doc.verified);

  return {
    organisationId: candidate.doc.entity_id,
    organisationName: candidate.doc.name,
    workerId: bestWorker?.doc.entity_id ?? null,
    workerName: bestWorker?.doc.name ?? null,
    vehicleId: null,
    rank: 0,
    score: round(weightedScore),
    confidence,
    matchFactors: allFactors,
    scoreBreakdown: {
      baseMatch: round(baseMatch * 100),
      preferenceAlignment: round(prefFactor.score * 100),
      reliability: round(relFactor.score * 100),
      urgencyBonus: round(urgFactor.score * 100),
      emotionalComfortBonus: round(emoFactor.score * 100),
      weights: { ...SCORE_WEIGHTS },
    },
    matchedServiceTypes: requiredSvcs.filter((s) => candidate.doc.service_types.includes(s)),
    matchedCapabilities: requiredCaps.filter((c) => allOrgCaps.includes(c)),
    distanceKm: candidate.geoDistanceKm,
    reasoning: buildReasoning(allFactors, confidence),
    unknowns: candidate.verification.unknowns,
    evidenceRefs: [],
  };
}

// ── Rank ────────────────────────────────────────────────────────────────────

export function rankRecommendations(
  recs: ScoredRecommendation[],
): ScoredRecommendation[] {
  return recs
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
