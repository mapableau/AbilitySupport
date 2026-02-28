/**
 * lib/ai/tools.ts — AI tool definitions for the Vercel AI SDK.
 *
 * Each tool is a typed object with a description, Zod parameter schema,
 * and an execute function. Tools are registered with the AI orchestrator
 * so the LLM can invoke them during a conversation.
 *
 * Convention: keep tool execute() functions thin — delegate to lib/db,
 * lib/search, or lib/risk for the actual logic.
 */

// TODO: uncomment once ai, zod, and domain libs are installed
// import { tool } from "ai";
// import { z } from "zod";
//
// export const searchProviders = tool({
//   description: "Search for providers by name, service type, or location proximity",
//   parameters: z.object({
//     query: z.string().describe("Free-text search query"),
//     serviceType: z.string().optional().describe("Filter by service type"),
//     nearLat: z.number().optional(),
//     nearLng: z.number().optional(),
//     radiusKm: z.number().default(25),
//   }),
//   execute: async (params) => {
//     // Delegate to lib/search for Typesense query
//     return { results: [], params };
//   },
// });
//
// export const getParticipantRisk = tool({
//   description: "Get the current risk score and flags for a participant",
//   parameters: z.object({
//     participantId: z.string().uuid(),
//   }),
//   execute: async ({ participantId }) => {
//     // Delegate to lib/risk scorer
//     return { participantId, score: 0, flags: [] };
//   },
// });
//
// export const listUpcomingBookings = tool({
//   description: "List upcoming bookings for a participant",
//   parameters: z.object({
//     participantId: z.string().uuid(),
//     limit: z.number().default(10),
//   }),
//   execute: async (params) => {
//     // Delegate to lib/db
//     return { bookings: [], params };
//   },
// });

export {};
