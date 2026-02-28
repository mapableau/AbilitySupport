/**
 * lib/ai/orchestrator.ts — Chat orchestration via Vercel AI SDK.
 *
 * Wires system prompts + tools into a streamText / generateText call.
 * Consumed by the Next.js chat API route (app/api/chat/route.ts).
 *
 * The orchestrator does NOT own the HTTP response — the route handler
 * calls toDataStreamResponse() on the result. This separation keeps
 * the orchestrator testable without a request context.
 */

// TODO: uncomment once ai and @ai-sdk/openai are installed
// import { streamText } from "ai";
// import { openai } from "@ai-sdk/openai";
// import { COORDINATOR_SYSTEM_PROMPT } from "./prompts";
// import { searchProviders, getParticipantRisk, listUpcomingBookings } from "./tools";
//
// export interface ChatOptions {
//   messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
//   participantContext?: string;
// }
//
// export function coordinatorChat(options: ChatOptions) {
//   const systemMessages = [
//     COORDINATOR_SYSTEM_PROMPT,
//     options.participantContext,
//   ].filter(Boolean).join("\n\n");
//
//   return streamText({
//     model: openai("gpt-4o"),
//     system: systemMessages,
//     messages: options.messages,
//     tools: {
//       searchProviders,
//       getParticipantRisk,
//       listUpcomingBookings,
//     },
//     maxSteps: 5,
//   });
// }

export {};
