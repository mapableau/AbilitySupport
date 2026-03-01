/**
 * lib/chat/context.ts — Context change detection and mapping.
 *
 * Pure functions that:
 *   1. Detect significant changes between previous and current context
 *   2. Map UI chip values to domain enums (needs profile + match spec)
 *   3. Build the dynamic context prompt fragment for the LLM
 */

import type { DynamicContext, ContextChange } from "./types.js";
import type { EmotionalState, NeedsUrgencyLevel, ActivityGoal, UrgencyLevel } from "../schemas/enums.js";

// ── Chip → domain enum mappings ────────────────────────────────────────────

const URGENCY_MAP: Record<DynamicContext["urgency"], { needs: NeedsUrgencyLevel; match: UrgencyLevel }> = {
  soon: { needs: "soon", match: "urgent" },
  today: { needs: "soon", match: "standard" },
  flexible: { needs: "routine", match: "low" },
};

const EMOTIONAL_MAP: Record<DynamicContext["emotionalState"], EmotionalState> = {
  calm: "calm",
  tired: "withdrawn",
  anxious: "anxious",
  overwhelmed: "distressed",
};

const GOAL_MAP: Record<DynamicContext["goalSpecificity"], ActivityGoal> = {
  appointment: "medical",
  social: "social",
  errand: "errands",
  unspecified: "care",
};

export function mapUrgency(chip: DynamicContext["urgency"]): { needs: NeedsUrgencyLevel; match: UrgencyLevel } {
  return URGENCY_MAP[chip];
}

export function mapEmotional(chip: DynamicContext["emotionalState"]): EmotionalState {
  return EMOTIONAL_MAP[chip];
}

export function mapGoal(chip: DynamicContext["goalSpecificity"]): ActivityGoal {
  return GOAL_MAP[chip];
}

// ── Context change detection ───────────────────────────────────────────────

const STRESS_STATES: ReadonlySet<DynamicContext["emotionalState"]> = new Set(["anxious", "overwhelmed"]);

/**
 * Detect whether the participant's context has changed significantly
 * between the previous turn and the current turn.
 *
 * Significant changes:
 *   - Emotional state escalated to anxious/overwhelmed from calm/tired
 *   - Urgency jumped from flexible to soon
 *   - Goal changed (different activity type)
 */
export function detectContextChange(
  previous: DynamicContext | undefined,
  current: DynamicContext,
): ContextChange {
  if (!previous) {
    return { changed: false, flags: [], severity: "none" };
  }

  const flags: string[] = [];

  if (previous.emotionalState !== current.emotionalState) {
    const wasCalm = !STRESS_STATES.has(previous.emotionalState);
    const nowStressed = STRESS_STATES.has(current.emotionalState);
    if (wasCalm && nowStressed) {
      flags.push(`Emotional state escalated: ${previous.emotionalState} → ${current.emotionalState}`);
    } else {
      flags.push(`Emotional state changed: ${previous.emotionalState} → ${current.emotionalState}`);
    }
  }

  if (previous.urgency !== current.urgency) {
    const escalated = previous.urgency === "flexible" && current.urgency === "soon";
    if (escalated) {
      flags.push(`Urgency escalated: ${previous.urgency} → ${current.urgency}`);
    } else {
      flags.push(`Urgency changed: ${previous.urgency} → ${current.urgency}`);
    }
  }

  if (previous.goalSpecificity !== current.goalSpecificity) {
    flags.push(`Goal changed: ${previous.goalSpecificity} → ${current.goalSpecificity}`);
  }

  if (flags.length === 0) {
    return { changed: false, flags: [], severity: "none" };
  }

  const hasStressEscalation = flags.some((f) => f.includes("escalated") || f.includes("Emotional state escalated"));
  const severity = hasStressEscalation ? "significant" : "minor";

  return { changed: true, flags, severity };
}

// ── Prompt builder ─────────────────────────────────────────────────────────

/**
 * Build a dynamic context prompt fragment that the LLM uses to tailor
 * its response. Injected after the system prompt but before messages.
 */
export function buildDynamicContextPrompt(ctx: DynamicContext, change: ContextChange): string {
  const parts = [
    `Participant's current state:`,
    `  Urgency: ${ctx.urgency}`,
    `  Emotional: ${ctx.emotionalState}`,
    `  Goal: ${ctx.goalSpecificity}`,
  ];

  if (ctx.functionalNeeds && ctx.functionalNeeds.length > 0) {
    parts.push(`  Functional needs: ${ctx.functionalNeeds.join(", ")}`);
  }

  if (ctx.contextTags && ctx.contextTags.length > 0) {
    parts.push(`  Context: ${ctx.contextTags.join(", ")}`);
  }

  if (change.changed) {
    parts.push("");
    parts.push(`⚠ Context change detected (${change.severity}):`);
    for (const flag of change.flags) {
      parts.push(`  - ${flag}`);
    }
    if (change.severity === "significant") {
      parts.push("  → Acknowledge the change empathetically. Adjust urgency of recommendations.");
    }
  }

  return parts.join("\n");
}
