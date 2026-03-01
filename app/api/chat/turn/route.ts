/**
 * POST /api/chat/turn — Process a chat turn with dynamic context.
 *
 * Accepts the conversation messages plus context chips (urgency,
 * emotional state, goal). Detects context changes, persists a needs
 * profile snapshot, enriches the match spec, and returns the reply.
 *
 * Body: {
 *   participantProfileId: uuid,
 *   messages: [{ role, content }],
 *   dynamicContext: { urgency, emotionalState, goalSpecificity, ... },
 *   previousContext?: { ... }
 * }
 */

import { z } from "zod";
import { processChatTurn } from "../../../../lib/chat/turn.js";
import {
  getAuthContext,
  unauthorizedResponse,
} from "../../../../lib/auth/index.js";

const dynamicContextSchema = z.object({
  urgency: z.enum(["soon", "today", "flexible"]),
  emotionalState: z.enum(["calm", "tired", "anxious", "overwhelmed"]),
  goalSpecificity: z.enum(["appointment", "social", "errand", "unspecified"]),
  functionalNeeds: z.array(z.string()).optional(),
  contextTags: z.array(z.string()).optional(),
});

const chatTurnSchema = z.object({
  participantProfileId: z.string().uuid(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })).min(1),
  dynamicContext: dynamicContextSchema,
  previousContext: dynamicContextSchema.optional(),
});

export async function POST(request: Request): Promise<Response> {
  const auth = await getAuthContext(request);
  if (!auth) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = chatTurnSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await processChatTurn(parsed.data);

  return Response.json(result);
}
