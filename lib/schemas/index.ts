/**
 * lib/schemas — Zod validation schemas shared between server and client.
 *
 * Convention: one file per domain entity, re-exported here.
 * Enums live in enums.ts as `as const` arrays — the single source of
 * truth for DB CHECK constraints, Zod validators, and UI dropdowns.
 *
 * Usage:
 *   import {
 *     matchSpecSchema, type MatchSpec,
 *     RISK_TIERS, type RiskTier,
 *     organisationProfileSchema, type OrganisationProfile,
 *   } from "@/lib/schemas";
 */

export * from "./enums.js";
export * from "./common.js";
export * from "./participant.js";
export * from "./organisation.js";
export * from "./worker.js";
export * from "./booking.js";
export * from "./match-spec.js";
export * from "./risk.js";
export * from "./recommendation.js";
export * from "./availability.js";
export * from "./followup.js";
