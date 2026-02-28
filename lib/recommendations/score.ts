/**
 * lib/recommendations/score.ts — Scoring, confidence, and ranking.
 *
 * Takes verified candidates and produces scored recommendations with
 * confidence labels and human-readable reasoning.
 */

import type { MatchSpec } from "../schemas/match-spec.js";
import type { ConfidenceLevel } from "../schemas/enums.js";
import type { MatchFactor } from "../schemas/recommendation.js";
import type { VerifiedOrgCandidate, ScoredRecommendation } from "./types.js";

// ── Scoring weights ────────────────────────────────────────────────────────

const WEIGHTS = {
  proximity: 25,
  capabilityMatch: 25,
  availability: 20,
  verification: 15,
  reliability: 15,
} as const;

// ── Factor calculators ─────────────────────────────────────────────────────

function proximityFactor(distanceKm: number | null, maxKm: number): MatchFactor {
  if (distanceKm === null) {
    return { factor: "proximity", score: 0.5, detail: "Location not available" };
  }
  const normalized = Math.max(0, 1 - distanceKm / maxKm);
  return {
    factor: "proximity",
    score: Math.round(normalized * 100) / 100,
    detail: `${distanceKm.toFixed(1)} km away`,
  };
}

function capabilityFactor(
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
    score: Math.round(score * 100) / 100,
    detail: missing.length > 0 ? `Missing: ${missing.join(", ")}` : "All capabilities matched",
  };
}

function availabilityFactor(confirmed: boolean): MatchFactor {
  return {
    factor: "availability",
    score: confirmed ? 1 : 0.3,
    detail: confirmed ? "Availability confirmed" : "Availability not confirmed",
  };
}

function verificationFactor(verified: boolean, orgPoolAllowed: boolean): MatchFactor {
  const score = verified && orgPoolAllowed ? 1 : verified ? 0.7 : 0.4;
  const detail = !orgPoolAllowed
    ? "Not in participant's provider pool"
    : verified
      ? "Organisation verified"
      : "Organisation not yet verified";
  return { factor: "verification_status", score, detail };
}

function reliabilityFactor(reliabilityScore: number): MatchFactor {
  return {
    factor: "reliability",
    score: Math.min(1, reliabilityScore / 100),
    detail: `Reliability score: ${reliabilityScore}/100`,
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
    .filter((f) => f.detail)
    .map((f) => f.detail)
    .join(". ");
  const confidenceNote = confidence === "verified"
    ? "All key constraints verified."
    : confidence === "likely"
      ? "Most constraints verified; organisation awaiting full verification."
      : "Some constraints could not be verified — coordinator should confirm.";
  return `${topFactors}. ${confidenceNote}`;
}

// ── Score a single org candidate ───────────────────────────────────────────

export function scoreOrgCandidate(
  candidate: VerifiedOrgCandidate,
  spec: MatchSpec,
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

  const workerCaps = bestWorker?.doc.capabilities ?? [];
  const allOrgCaps = [...new Set(candidate.workers.flatMap((w) => w.doc.capabilities))];

  const factors: MatchFactor[] = [
    proximityFactor(candidate.geoDistanceKm, maxKm),
    capabilityFactor(
      allOrgCaps,
      requiredCaps as string[],
      candidate.doc.service_types,
      requiredSvcs as string[],
    ),
    availabilityFactor(candidate.verification.availabilityConfirmed),
    verificationFactor(candidate.doc.verified, candidate.verification.orgPoolAllowed),
    reliabilityFactor(candidate.doc.reliability_score),
  ];

  const weightedScore =
    factors[0].score * WEIGHTS.proximity +
    factors[1].score * WEIGHTS.capabilityMatch +
    factors[2].score * WEIGHTS.availability +
    factors[3].score * WEIGHTS.verification +
    factors[4].score * WEIGHTS.reliability;

  const confidence = assignConfidence(candidate.verification, candidate.doc.verified);

  return {
    organisationId: candidate.doc.entity_id,
    organisationName: candidate.doc.name,
    workerId: bestWorker?.doc.entity_id ?? null,
    workerName: bestWorker?.doc.name ?? null,
    vehicleId: null,
    rank: 0,
    score: Math.round(weightedScore * 10) / 10,
    confidence,
    matchFactors: factors,
    matchedServiceTypes: requiredSvcs.filter((s) =>
      candidate.doc.service_types.includes(s),
    ),
    matchedCapabilities: requiredCaps.filter((c) =>
      allOrgCaps.includes(c),
    ),
    distanceKm: candidate.geoDistanceKm,
    reasoning: buildReasoning(factors, confidence),
    unknowns: candidate.verification.unknowns,
    evidenceRefs: [],
  };
}

// ── Rank an array of scored recommendations ────────────────────────────────

export function rankRecommendations(
  recs: ScoredRecommendation[],
): ScoredRecommendation[] {
  return recs
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
