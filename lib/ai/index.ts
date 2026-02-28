/**
 * lib/ai — AI chat orchestration (Vercel AI SDK).
 *
 * Composes system prompts, tool definitions, and the streamText
 * orchestrator consumed by the chat API route.
 *
 * Usage:
 *   import { coordinatorChat } from "@/lib/ai";
 */

export * from "./orchestrator";
export * from "./prompts";
export * from "./tools";
