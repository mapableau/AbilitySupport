/**
 * lib/recommendations/card.ts — RecommendationCard DTO.
 *
 * A single hydrated object that merges:
 *   - Typesense search doc fields (name, location, capabilities, service area)
 *   - Postgres-verified fields (clearance, availability, evidence counts)
 *   - Pipeline scoring (rank, score, confidence, reasoning)
 *
 * The UI renders this directly — no extra API calls needed.
 */

import type { ConfidenceLevel } from "../schemas/enums.js";
import type { MatchFactor } from "../schemas/recommendation.js";

// ── Organisation summary (from Typesense org doc) ──────────────────────────

export interface CardOrganisation {
  id: string;
  name: string;
  orgType: string;
  serviceTypes: string[];
  serviceAreaTokens: string[];
  location: { lat: number; lng: number } | null;
  verified: boolean;
  active: boolean;
  workerCount: number;
  reliabilityScore: number;
  wavAvailable: boolean;
  hasTransferAssist: boolean;
  hasManualHandling: boolean;
  totalVehicles: number;
  vehicleTypes: string[];
}

// ── Worker summary (from Typesense worker doc) ─────────────────────────────

export interface CardWorker {
  id: string;
  name: string;
  workerRole: string;
  capabilities: string[];
  canDrive: boolean;
  clearanceStatus: string;
  clearanceCurrent: boolean;
}

// ── Verification badge (from Postgres checks) ──────────────────────────────

export interface CardVerification {
  availabilityConfirmed: boolean;
  vehicleAvailable: boolean | null;
  clearanceCurrent: boolean | null;
  orgPoolAllowed: boolean;
  unknowns: string[];
  evidenceCounts: { total: number; verified: number };
}

// ── The hydrated card ──────────────────────────────────────────────────────

export interface RecommendationCard {
  /** Same fields as ScoredRecommendation for backwards compat. */
  organisationId: string;
  workerId: string | null;
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

  /** Hydrated sub-objects — the UI reads these directly. */
  organisation: CardOrganisation;
  worker: CardWorker | null;
  verification: CardVerification;

  /** UI hint: short human-readable label for the card header. */
  label: string;
  /** UI hint: confidence badge colour. */
  confidenceColor: "green" | "amber" | "red";
}
