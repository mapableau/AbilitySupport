/**
 * lib/followups — Post-service follow-up system.
 *
 * Signal analysis, escalation, and data access for the followup lifecycle.
 */

export * from "./types.js";
export { analyseFollowupResponse } from "./signals.js";
export * from "./data.js";
