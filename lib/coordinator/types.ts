/**
 * lib/coordinator/types.ts — Row types for the coordinator review queue.
 */

export type QueueItemKind = "human_review" | "needs_verification";

export interface QueuedRequest {
  kind: "human_review";
  id: string;
  participantProfileId: string;
  participantName: string;
  requestType: string;
  serviceType: string | null;
  urgency: string;
  status: string;
  preferredStart: string | null;
  preferredEnd: string | null;
  notes: string | null;
  aiSummary: string | null;
  policyReasons: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QueuedRecommendation {
  kind: "needs_verification";
  id: string;
  coordinationRequestId: string;
  organisationId: string;
  organisationName: string;
  workerId: string | null;
  workerName: string | null;
  rank: number;
  score: number;
  confidence: string;
  reasoning: string | null;
  unknowns: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type QueueItem = QueuedRequest | QueuedRecommendation;

export interface CoordinatorAuthContext {
  userId: string;
}
