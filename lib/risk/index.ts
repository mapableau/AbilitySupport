/**
 * lib/risk — Participant risk scoring and flag evaluation.
 *
 * Pure domain logic with no infrastructure dependencies.
 * The scorer is invoked by workflows (lib/workflows) and API routes.
 *
 * Usage:
 *   import { scoreParticipantRisk, RISK_FLAGS } from "@/lib/risk";
 */

export * from "./flags";
export * from "./scorer";
export * from "./policy";
