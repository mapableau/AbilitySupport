/**
 * lib/followups/signals.ts — Negative-signal detection from followup responses.
 *
 * Pure function: analyses a followup response and determines whether
 * the experience was negative and whether escalation is needed.
 *
 * Escalation criteria:
 *   - Rating 1–2 (out of 5) → negative sentiment → escalate
 *   - Accessibility mismatch reported → always escalate
 *   - "wouldUseAgain" = false with rating ≤ 3 → escalate
 *   - Specific issue keywords (safety, injury, neglect) → escalate
 */

import type { FollowupResponseInput, SignalAnalysis, Sentiment } from "./types.js";

const SAFETY_KEYWORDS = [
  "unsafe",
  "safety",
  "injury",
  "injured",
  "neglect",
  "abuse",
  "harm",
  "harmed",
  "danger",
  "dangerous",
  "emergency",
  "incident",
];

function classifySentiment(rating: number): Sentiment {
  if (rating <= 2) return "negative";
  if (rating <= 3) return "neutral";
  return "positive";
}

function containsSafetyKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return SAFETY_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Analyse a followup response for negative signals.
 *
 * Returns a deterministic analysis — same input always produces same output.
 * No DB calls, no side effects.
 */
export function analyseFollowupResponse(input: FollowupResponseInput): SignalAnalysis {
  const sentiment = classifySentiment(input.rating);
  const isNegative = sentiment === "negative";
  const hasAccessibilityMismatch = !input.accessibilityMatch;
  const reasons: string[] = [];

  if (isNegative) {
    reasons.push(`Low rating (${input.rating}/5)`);
  }

  if (hasAccessibilityMismatch) {
    reasons.push("Accessibility mismatch reported by participant");
  }

  if (!input.wouldUseAgain && input.rating <= 3) {
    reasons.push("Participant would not use this provider again");
  }

  if (input.comment && containsSafetyKeywords(input.comment)) {
    reasons.push("Safety-related keywords detected in feedback");
  }

  if (input.issues) {
    for (const issue of input.issues) {
      if (containsSafetyKeywords(issue)) {
        reasons.push(`Safety concern in reported issue: "${issue}"`);
        break;
      }
    }
  }

  const requiresEscalation = reasons.length > 0;

  return {
    sentiment,
    isNegative,
    hasAccessibilityMismatch,
    requiresEscalation,
    escalationReasons: reasons,
  };
}
