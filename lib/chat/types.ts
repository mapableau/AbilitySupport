/**
 * lib/chat/types.ts — Types for the chat turn system.
 */

import type { EmotionalState, NeedsUrgencyLevel, ActivityGoal } from "../schemas/enums.js";
import type { MatchSpec } from "../schemas/match-spec.js";

/** Chip values the UI sends with each chat turn. */
export interface DynamicContext {
  urgency: "soon" | "today" | "flexible";
  emotionalState: "calm" | "tired" | "anxious" | "overwhelmed";
  goalSpecificity: "appointment" | "social" | "errand" | "unspecified";
  functionalNeeds?: string[];
  contextTags?: string[];
}

/** A single chat message. */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Input to the /api/chat/turn endpoint. */
export interface ChatTurnInput {
  participantProfileId: string;
  messages: ChatMessage[];
  dynamicContext: DynamicContext;
  previousContext?: DynamicContext;
}

/** Detected context change between turns. */
export interface ContextChange {
  changed: boolean;
  flags: string[];
  severity: "none" | "minor" | "significant";
}

/** Output from processing a chat turn. */
export interface ChatTurnResult {
  reply: string;
  matchSpec: MatchSpec | null;
  needsProfileId: string | null;
  contextChange: ContextChange;
  dynamicContext: DynamicContext;
}
