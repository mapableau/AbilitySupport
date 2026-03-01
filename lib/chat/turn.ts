/**
 * lib/chat/turn.ts — Chat turn processor.
 *
 * Orchestrates a single chat turn:
 *   1. Detect context changes from previous turn
 *   2. Persist a needs profile snapshot
 *   3. Build the enriched match spec with dynamic context
 *   4. Generate the LLM reply (stubbed until Vercel AI SDK is wired)
 */

import type { ChatTurnInput, ChatTurnResult, DynamicContext } from "./types.js";
import type { MatchSpec } from "../schemas/match-spec.js";
import type { ServiceType } from "../schemas/enums.js";
import type { CreateNeedsProfileInput } from "../schemas/needs-profile.js";
import { detectContextChange, mapUrgency, mapEmotional, mapGoal, buildDynamicContextPrompt } from "./context.js";

// ── Needs profile persistence (stubbed) ────────────────────────────────────

async function persistNeedsProfile(input: CreateNeedsProfileInput): Promise<string> {
  // TODO: INSERT INTO needs_profiles (...) VALUES (...) RETURNING id
  console.log(`[chat/turn] persistNeedsProfile(${input.participantId}) — stub`);
  return crypto.randomUUID();
}

// ── Match spec enrichment ──────────────────────────────────────────────────

function enrichMatchSpec(
  participantProfileId: string,
  ctx: DynamicContext,
): MatchSpec {
  const urgency = mapUrgency(ctx.urgency);
  const goal = mapGoal(ctx.goalSpecificity);

  const requestType = goal === "social" || goal === "errands"
    ? "both" as const
    : goal === "medical"
      ? "transport" as const
      : "care" as const;

  const serviceTypes: ServiceType[] = [];
  if (["care", "social", "errands"].includes(goal)) serviceTypes.push("personal_care");
  if (["social", "errands", "medical"].includes(goal)) serviceTypes.push("transport");
  if (goal === "social") serviceTypes.push("community_access");
  if (goal === "medical") serviceTypes.push("therapy");

  return {
    participantProfileId,
    requestType,
    serviceTypes,
    urgency: urgency.match,
    maxDistanceKm: 25,
  };
}

// ── Main turn processor ────────────────────────────────────────────────────

export async function processChatTurn(input: ChatTurnInput): Promise<ChatTurnResult> {
  const contextChange = detectContextChange(input.previousContext, input.dynamicContext);

  const needsInput: CreateNeedsProfileInput = {
    participantId: input.participantProfileId,
    functionalNeeds: (input.dynamicContext.functionalNeeds ?? []) as CreateNeedsProfileInput["functionalNeeds"],
    emotionalState: mapEmotional(input.dynamicContext.emotionalState),
    urgencyLevel: mapUrgency(input.dynamicContext.urgency).needs,
    activityGoal: mapGoal(input.dynamicContext.goalSpecificity),
    contextTags: input.dynamicContext.contextTags ?? [],
    notes: contextChange.changed
      ? `Context change: ${contextChange.flags.join("; ")}`
      : undefined,
  };

  const needsProfileId = await persistNeedsProfile(needsInput);

  const matchSpec = enrichMatchSpec(input.participantProfileId, input.dynamicContext);

  const contextPrompt = buildDynamicContextPrompt(input.dynamicContext, contextChange);

  // TODO: call coordinatorChat() with messages + contextPrompt
  // For now, build a stub reply that acknowledges the context
  let reply = "I understand. Let me find the right support for you.";

  if (contextChange.severity === "significant") {
    reply = "I notice things have changed — let me adjust my recommendations to match how you're feeling right now. " + reply;
  }

  if (input.dynamicContext.urgency === "soon") {
    reply += " I'll prioritise providers who are available soon.";
  }

  return {
    reply,
    matchSpec,
    needsProfileId,
    contextChange,
    dynamicContext: input.dynamicContext,
  };
}
