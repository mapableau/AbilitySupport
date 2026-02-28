/**
 * lib/followups/types.ts — Types for the follow-up system.
 */

export interface BookingRow {
  id: string;
  participantProfileId: string;
  organisationId: string;
  workerId: string | null;
  vehicleId: string | null;
  status: string;
}

export interface FollowupRow {
  id: string;
  bookingId: string;
  createdBy: string;
  followupType: string;
  status: string;
  priority: string;
  summary: string | null;
  details: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FollowupResponseInput {
  rating: number;
  comment?: string;
  accessibilityMatch: boolean;
  wouldUseAgain: boolean;
  issues?: string[];
}

export type Sentiment = "positive" | "neutral" | "negative";

export interface SignalAnalysis {
  sentiment: Sentiment;
  isNegative: boolean;
  hasAccessibilityMismatch: boolean;
  requiresEscalation: boolean;
  escalationReasons: string[];
}
