/**
 * lib/risk/scorer.ts — Risk scoring engine.
 *
 * Pure-function design: accepts participant data, returns a scored result.
 * No side effects, no DB calls — the caller fetches data and passes it in.
 * This keeps the scorer testable without mocking infrastructure.
 *
 * Integration point: called by the Inngest "risk.recalculate" workflow
 * (see lib/workflows/functions/) on a nightly schedule and on booking events.
 */

import type { RiskFlag } from "./flags";

export interface RiskInput {
  participantId: string;
  activeProviderCount: number;
  upcomingTransportGaps: number;
  planExpiresAt: Date | null;
  missedBookingsLast30: number;
  providerComplianceOverdue: boolean;
}

export interface RiskResult {
  participantId: string;
  score: number;
  triggeredFlags: RiskFlag[];
  assessedAt: Date;
}

/**
 * Evaluate risk flags against participant data and return a composite score.
 * Score range: 0 (no risk) – 100+ (critical).
 */
export function scoreParticipantRisk(_input: RiskInput): RiskResult {
  // TODO: implement flag evaluation logic once domain rules are confirmed
  return {
    participantId: _input.participantId,
    score: 0,
    triggeredFlags: [],
    assessedAt: new Date(),
  };
}
