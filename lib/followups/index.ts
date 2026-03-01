/**
 * lib/followups — Post-service follow-up system.
 *
 * Signal analysis, outcome capture, escalation, and data access.
 */

export * from "./types.js";
export { analyseFollowupResponse } from "./signals.js";
export * from "./data.js";
export {
  analyseOutcome,
  persistOutcome,
  adjustReliabilityScore,
  updateContinuityPreference,
  appendToNeedsProfile,
  type OutcomeAnalysis,
} from "./outcomes.js";
