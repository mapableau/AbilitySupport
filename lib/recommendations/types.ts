/**
 * lib/recommendations/types.ts — Shared types for the recommendation pipeline.
 */

import type { MatchSpec } from "../schemas/match-spec.js";
import type { ConfidenceLevel } from "../schemas/enums.js";
import type { MatchFactor } from "../schemas/recommendation.js";
import type {
  OrganisationSearchDoc,
  WorkerSearchDoc,
} from "../search/indexer/types.js";

// ── Coordination request row (from DB) ─────────────────────────────────────

export interface CoordinationRequestRow {
  id: string;
  participant_profile_id: string;
  requested_by: string;
  request_type: string;
  service_type: string | null;
  urgency: string;
  status: string;
  preferred_start: Date | null;
  preferred_end: Date | null;
  location_lat: number | null;
  location_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  notes: string | null;
  ai_summary: string | null;
}

/** A match_spec either stored on the request or reconstructed from its fields. */
export interface LoadedRequest {
  row: CoordinationRequestRow;
  matchSpec: MatchSpec;
}

// ── Search candidates ──────────────────────────────────────────────────────

export interface OrgCandidate {
  source: "typesense";
  doc: OrganisationSearchDoc;
  textScore: number;
  geoDistanceKm: number | null;
}

export interface WorkerCandidate {
  source: "typesense";
  doc: WorkerSearchDoc;
  textScore: number;
  geoDistanceKm: number | null;
}

// ── Verification results ───────────────────────────────────────────────────

export interface VerificationResult {
  availabilityConfirmed: boolean;
  vehicleAvailable: boolean | null;
  clearanceCurrent: boolean | null;
  orgPoolAllowed: boolean;
  unknowns: string[];
}

export interface VerifiedOrgCandidate extends OrgCandidate {
  verification: VerificationResult;
  workers: VerifiedWorkerCandidate[];
}

export interface VerifiedWorkerCandidate extends WorkerCandidate {
  verification: VerificationResult;
}

// ── Scored & ranked ────────────────────────────────────────────────────────

export interface ScoredRecommendation {
  organisationId: string;
  organisationName: string;
  workerId: string | null;
  workerName: string | null;
  vehicleId: string | null;
  rank: number;
  score: number;
  confidence: ConfidenceLevel;
  matchFactors: MatchFactor[];
  matchedServiceTypes: string[];
  matchedCapabilities: string[];
  distanceKm: number | null;
  reasoning: string;
  unknowns: string[];
  evidenceRefs: string[];
}

// ── Grouped response ───────────────────────────────────────────────────────

/**
 * Combined: a single org can handle both care and transport.
 * Split: separate orgs for care and transport legs.
 */
export interface GroupedRecommendations {
  requestId: string;
  requestType: string;
  combined: ScoredRecommendation[];
  split: {
    care: ScoredRecommendation[];
    transport: ScoredRecommendation[];
  };
  meta: {
    totalCandidatesSearched: number;
    totalVerified: number;
    totalReturned: number;
    generatedAt: string;
  };
}
