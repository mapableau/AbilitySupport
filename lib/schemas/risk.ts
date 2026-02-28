/**
 * lib/schemas/risk.ts — Risk tier schemas and gating decision table.
 *
 * The risk tier is a computed classification stored on participant_profiles.
 * Each tier gates which actions are allowed, how frequently check-ins are
 * required, and who needs to be notified.
 *
 * Gating rules are defined as data (not code) so they can be displayed in
 * the UI and audited without reading implementation logic.
 */

import { z } from "zod";
import { uuidSchema } from "./common.js";
import { RISK_TIERS, RISK_FLAG_CATEGORIES } from "./enums.js";
import type { RiskTier, RiskFlagCategory } from "./enums.js";

// ── Risk assessment result ─────────────────────────────────────────────────

/** A single triggered risk flag with its weight and category. */
export const riskFlagSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  weight: z.number().int().positive(),
  category: z.enum(RISK_FLAG_CATEGORIES),
});

export type RiskFlag = z.infer<typeof riskFlagSchema>;

/** The result of scoring a participant's risk. */
export const riskAssessmentSchema = z.object({
  participantProfileId: uuidSchema,
  /** Composite score: sum of triggered flag weights. 0 = no risk. */
  score: z.number().int().nonnegative(),
  /** Which tier the score falls into. */
  tier: z.enum(RISK_TIERS),
  triggeredFlags: z.array(riskFlagSchema),
  assessedAt: z.coerce.date(),
});

export type RiskAssessment = z.infer<typeof riskAssessmentSchema>;

// ── Score → tier mapping ───────────────────────────────────────────────────

/**
 * Derive a risk tier from a numeric score.
 * Thresholds are tuned to the flag weights in lib/risk/flags.ts.
 */
export function tierFromScore(score: number): RiskTier {
  if (score >= 80) return "critical";
  if (score >= 55) return "high";
  if (score >= 30) return "elevated";
  if (score >= 10) return "standard";
  return "low";
}

// ── Gating decision table ──────────────────────────────────────────────────

/**
 * What the system allows / requires at each risk tier.
 * Consumed by API route guards and the coordinator dashboard.
 */
export interface RiskGate {
  tier: RiskTier;
  /** Participant can book without coordinator involvement. */
  allowSelfService: boolean;
  /** A coordinator must approve before a booking is confirmed. */
  requiresCoordinatorApproval: boolean;
  /** The case must be escalated to a team lead / manager. */
  requiresManagerEscalation: boolean;
  /** System auto-notifies the assigned coordinator on any event. */
  autoNotifyCoordinator: boolean;
  /** Maximum days between proactive check-ins. null = no requirement. */
  maxDaysBetweenCheckIns: number | null;
}

export const RISK_GATES: readonly RiskGate[] = [
  {
    tier: "low",
    allowSelfService: true,
    requiresCoordinatorApproval: false,
    requiresManagerEscalation: false,
    autoNotifyCoordinator: false,
    maxDaysBetweenCheckIns: null,
  },
  {
    tier: "standard",
    allowSelfService: true,
    requiresCoordinatorApproval: false,
    requiresManagerEscalation: false,
    autoNotifyCoordinator: false,
    maxDaysBetweenCheckIns: 30,
  },
  {
    tier: "elevated",
    allowSelfService: false,
    requiresCoordinatorApproval: true,
    requiresManagerEscalation: false,
    autoNotifyCoordinator: true,
    maxDaysBetweenCheckIns: 14,
  },
  {
    tier: "high",
    allowSelfService: false,
    requiresCoordinatorApproval: true,
    requiresManagerEscalation: true,
    autoNotifyCoordinator: true,
    maxDaysBetweenCheckIns: 7,
  },
  {
    tier: "critical",
    allowSelfService: false,
    requiresCoordinatorApproval: true,
    requiresManagerEscalation: true,
    autoNotifyCoordinator: true,
    maxDaysBetweenCheckIns: 3,
  },
] as const;

/** Look up the gating rules for a given tier. */
export function gateForTier(tier: RiskTier): RiskGate {
  const gate = RISK_GATES.find((g) => g.tier === tier);
  if (!gate) throw new Error(`Unknown risk tier: ${tier}`);
  return gate;
}
