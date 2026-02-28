/**
 * lib/risk/policy.ts — Deterministic risk policy engine for match requests.
 *
 * Evaluates a MatchSpec plus contextual signals (distress, recurring,
 * WAV/transfer needs, unknown fields) and returns a policy decision that
 * controls whether the match can be auto-confirmed, needs verification,
 * or requires human review.
 *
 * Design:
 *   - Pure function — no DB, no side effects, trivially unit-testable.
 *   - Deterministic — same inputs always produce the same output.
 *   - Tier cascade: sensitive > high > medium > low. The highest
 *     triggered tier wins; all triggered reasons are collected.
 */

import type { MatchSpec } from "../schemas/match-spec.js";

// ── Policy tier (distinct from participant RISK_TIERS) ─────────────────────

export const POLICY_TIERS = ["low", "medium", "high", "sensitive"] as const;
export type PolicyTier = (typeof POLICY_TIERS)[number];

// ── Input / Output ─────────────────────────────────────────────────────────

export interface PolicyInput {
  /** The structured match request from the AI chat. */
  matchSpec: MatchSpec;
  /** Field names the AI could not extract with confidence. */
  unknownCriticalFields: string[];
  /** Whether this request is part of a recurring booking bundle. */
  isRecurring: boolean;
  /** Wheelchair-accessible vehicle required. */
  requiresWav: boolean;
  /** Transfer assistance (e.g. bed-to-chair) required. */
  requiresTransferAssist: boolean;
  /** Heavy manual handling required. */
  requiresManualHandling: boolean;
  /** Coordinator flagged participant distress. */
  distressSignal: boolean;
}

export interface PolicyDecision {
  /** The highest triggered risk tier. */
  riskTier: PolicyTier;
  /** A coordinator must manually review before proceeding. */
  requiresHumanReview: boolean;
  /** Provider/worker details must be verified before confirmation. */
  requiresVerification: boolean;
  /** The system may auto-confirm this match without human intervention. */
  autoConfirmAllowed: boolean;
  /** Human-readable reasons for every rule that fired. */
  reasons: string[];
}

// ── Policy rules ───────────────────────────────────────────────────────────

const TIER_RANK: Record<PolicyTier, number> = {
  low: 0,
  medium: 1,
  high: 2,
  sensitive: 3,
};

function higherTier(a: PolicyTier, b: PolicyTier): PolicyTier {
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

/**
 * Evaluate the risk policy for a match request.
 *
 * Rules are evaluated in priority order (sensitive → high → medium).
 * Every rule that fires adds a reason string. The final tier is the
 * highest tier triggered by any rule.
 */
export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  let tier: PolicyTier = "low";
  const reasons: string[] = [];

  const { matchSpec } = input;
  const urgency = matchSpec.urgency ?? "standard";
  const requestType = matchSpec.requestType;
  const serviceTypes = matchSpec.serviceTypes ?? [];
  const caps = matchSpec.requirements?.requiredCapabilities ?? [];

  // ── Sensitive tier ─────────────────────────────────────────────────────

  if (input.distressSignal) {
    tier = higherTier(tier, "sensitive");
    reasons.push("Distress signal flagged by coordinator");
  }

  if (urgency === "emergency") {
    tier = higherTier(tier, "sensitive");
    reasons.push("Emergency urgency level");
  }

  // ── High tier ──────────────────────────────────────────────────────────

  if (input.unknownCriticalFields.length > 0) {
    tier = higherTier(tier, "high");
    reasons.push(
      `Unknown critical fields: ${input.unknownCriticalFields.join(", ")}`,
    );
  }

  if (input.requiresTransferAssist) {
    tier = higherTier(tier, "high");
    reasons.push("Transfer assistance required — safety-critical capability");
  }

  if (input.requiresManualHandling) {
    tier = higherTier(tier, "high");
    reasons.push("Manual handling required — safety-critical capability");
  }

  if (urgency === "urgent" && input.isRecurring) {
    tier = higherTier(tier, "high");
    reasons.push("Urgent recurring request — unusual combination requires review");
  }

  if (
    input.requiresWav &&
    caps.includes("wheelchair_transfer") &&
    input.unknownCriticalFields.includes("wav_availability")
  ) {
    tier = higherTier(tier, "high");
    reasons.push("WAV required but vehicle availability is unknown");
  }

  // ── Medium tier ────────────────────────────────────────────────────────

  if (input.isRecurring && TIER_RANK[tier] < TIER_RANK["high"]) {
    tier = higherTier(tier, "medium");
    reasons.push("Recurring booking bundle — needs schedule conflict check");
  }

  if (input.requiresWav) {
    tier = higherTier(tier, "medium");
    reasons.push("Wheelchair-accessible vehicle required");
  }

  if (requestType === "both") {
    tier = higherTier(tier, "medium");
    reasons.push("Combined care + transport coordination");
  }

  if (serviceTypes.includes("therapy")) {
    tier = higherTier(tier, "medium");
    reasons.push("Therapy service — worker qualifications must be verified");
  }

  if (urgency === "urgent" && !input.isRecurring) {
    tier = higherTier(tier, "medium");
    reasons.push("Urgent request — expedited matching required");
  }

  // ── Decision mapping ───────────────────────────────────────────────────

  return {
    riskTier: tier,
    ...decisionsForTier(tier),
    reasons,
  };
}

/** Map a policy tier to its boolean decision flags. */
function decisionsForTier(tier: PolicyTier): Pick<
  PolicyDecision,
  "requiresHumanReview" | "requiresVerification" | "autoConfirmAllowed"
> {
  switch (tier) {
    case "sensitive":
      return {
        requiresHumanReview: true,
        requiresVerification: true,
        autoConfirmAllowed: false,
      };
    case "high":
      return {
        requiresHumanReview: true,
        requiresVerification: true,
        autoConfirmAllowed: false,
      };
    case "medium":
      return {
        requiresHumanReview: false,
        requiresVerification: true,
        autoConfirmAllowed: false,
      };
    case "low":
      return {
        requiresHumanReview: false,
        requiresVerification: false,
        autoConfirmAllowed: true,
      };
  }
}
