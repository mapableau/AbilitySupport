/**
 * lib/recommendations/hydrate.ts — Hydrate ScoredRecommendations into cards.
 *
 * Pure function: takes scored recommendations + the verified candidate
 * data that was already fetched during the pipeline, and merges them
 * into RecommendationCard DTOs. No extra DB or search calls.
 */

import type { ConfidenceLevel } from "../schemas/enums.js";
import type {
  ScoredRecommendation,
  VerifiedOrgCandidate,
} from "./types.js";
import type {
  RecommendationCard,
  CardOrganisation,
  CardWorker,
  CardVerification,
} from "./card.js";

function confidenceColor(c: ConfidenceLevel): "green" | "amber" | "red" {
  switch (c) {
    case "verified": return "green";
    case "likely": return "amber";
    case "needs_verification": return "red";
  }
}

function buildLabel(rec: ScoredRecommendation): string {
  const parts = [rec.organisationName];
  if (rec.workerName) parts.push(`– ${rec.workerName}`);
  return parts.join(" ");
}

/**
 * Hydrate a single scored recommendation into a RecommendationCard.
 *
 * `verifiedMap` is keyed by organisation entity_id and carries the
 * full Typesense doc + verification result + worker docs from the
 * pipeline's verify step. We read from it without any extra I/O.
 */
export function hydrateCard(
  rec: ScoredRecommendation,
  verifiedMap: Map<string, VerifiedOrgCandidate>,
  evidenceCountsMap: Map<string, { total: number; verified: number }>,
): RecommendationCard {
  const verified = verifiedMap.get(rec.organisationId);
  const orgDoc = verified?.doc;
  const bestWorkerDoc = rec.workerId && verified
    ? verified.workers.find((w) => w.doc.entity_id === rec.workerId)?.doc
    : null;

  const organisation: CardOrganisation = {
    id: rec.organisationId,
    name: orgDoc?.name ?? rec.organisationName,
    orgType: orgDoc?.org_type ?? "care",
    serviceTypes: orgDoc?.service_types ?? [],
    serviceAreaTokens: orgDoc?.service_area_tokens ?? [],
    location: orgDoc?.location
      ? { lat: orgDoc.location[0], lng: orgDoc.location[1] }
      : null,
    verified: orgDoc?.verified ?? false,
    active: orgDoc?.active ?? true,
    workerCount: orgDoc?.worker_count ?? 0,
    reliabilityScore: orgDoc?.reliability_score ?? 0,
    wavAvailable: orgDoc?.wav_available ?? false,
    hasTransferAssist: orgDoc?.has_transfer_assist ?? false,
    hasManualHandling: orgDoc?.has_manual_handling ?? false,
    totalVehicles: orgDoc?.total_vehicles ?? 0,
    vehicleTypes: orgDoc?.vehicle_types ?? [],
  };

  const worker: CardWorker | null = bestWorkerDoc
    ? {
        id: bestWorkerDoc.entity_id,
        name: bestWorkerDoc.name,
        workerRole: bestWorkerDoc.worker_role,
        capabilities: [...bestWorkerDoc.capabilities],
        canDrive: bestWorkerDoc.can_drive,
        clearanceStatus: bestWorkerDoc.clearance_status,
        clearanceCurrent: bestWorkerDoc.clearance_current,
      }
    : null;

  const orgEvidence = evidenceCountsMap.get(`organisation:${rec.organisationId}`) ?? { total: 0, verified: 0 };
  const workerEvidence = rec.workerId
    ? evidenceCountsMap.get(`worker:${rec.workerId}`) ?? { total: 0, verified: 0 }
    : { total: 0, verified: 0 };

  const verification: CardVerification = {
    availabilityConfirmed: verified?.verification.availabilityConfirmed ?? false,
    vehicleAvailable: verified?.verification.vehicleAvailable ?? null,
    clearanceCurrent: verified?.verification.clearanceCurrent ?? null,
    orgPoolAllowed: verified?.verification.orgPoolAllowed ?? true,
    unknowns: rec.unknowns,
    evidenceCounts: {
      total: orgEvidence.total + workerEvidence.total,
      verified: orgEvidence.verified + workerEvidence.verified,
    },
  };

  return {
    organisationId: rec.organisationId,
    workerId: rec.workerId,
    vehicleId: rec.vehicleId,
    rank: rec.rank,
    score: rec.score,
    confidence: rec.confidence,
    matchFactors: rec.matchFactors,
    scoreBreakdown: rec.scoreBreakdown,
    matchedServiceTypes: rec.matchedServiceTypes,
    matchedCapabilities: rec.matchedCapabilities,
    distanceKm: rec.distanceKm,
    reasoning: rec.reasoning,
    unknowns: rec.unknowns,
    evidenceRefs: rec.evidenceRefs,
    organisation,
    worker,
    verification,
    label: buildLabel(rec),
    confidenceColor: confidenceColor(rec.confidence),
  };
}

/** Hydrate an array, preserving rank order. */
export function hydrateCards(
  recs: ScoredRecommendation[],
  verifiedMap: Map<string, VerifiedOrgCandidate>,
  evidenceCountsMap: Map<string, { total: number; verified: number }>,
): RecommendationCard[] {
  return recs.map((r) => hydrateCard(r, verifiedMap, evidenceCountsMap));
}
