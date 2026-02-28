/**
 * lib/schemas/match-spec.ts — MatchSpec: the structured output produced
 * by the AI chat when a coordinator asks to find a provider.
 *
 * The LLM extracts a MatchSpec from the conversation, which is then
 * used by the matching engine (lib/search + lib/db spatial queries) to
 * find and rank suitable organisations/workers.
 *
 * Flow:
 *   coordinator message → AI orchestrator → MatchSpec (validated)
 *                       → matching engine  → Recommendation[]
 */

import { z } from "zod";
import { coordinatesSchema, uuidSchema } from "./common.js";
import {
  REQUEST_TYPES,
  SERVICE_TYPES,
  URGENCY_LEVELS,
  GENDER_PREFERENCES,
  WORKER_CAPABILITIES,
} from "./enums.js";

// ── Requirements sub-object ────────────────────────────────────────────────

/** Participant-side constraints the matching engine must respect. */
export const matchRequirementsSchema = z.object({
  wheelchairAccessible: z.boolean().default(false),
  genderPreference: z.enum(GENDER_PREFERENCES).optional(),
  languagePreference: z.string().min(2).max(10).optional(),
  /**
   * Capabilities the worker MUST have (e.g. ["driving", "personal_care"]).
   * A "support worker who drives" request sets this to
   * ["personal_care", "driving"].
   */
  requiredCapabilities: z.array(z.enum(WORKER_CAPABILITIES)).default([]),
  /** Free-text qualifications the coordinator mentioned. */
  specialQualifications: z.array(z.string().max(200)).default([]),
  /** Only match verified (ABN-checked) organisations. */
  verifiedOrganisationsOnly: z.boolean().default(false),
});

export type MatchRequirements = z.infer<typeof matchRequirementsSchema>;

// ── MatchSpec ──────────────────────────────────────────────────────────────

/**
 * The structured intent extracted from coordinator chat.
 * All fields except participantProfileId and requestType are optional
 * so the AI can produce a partial spec that the coordinator refines.
 */
export const matchSpecSchema = z.object({
  /** Which participant this match is for. */
  participantProfileId: uuidSchema,
  /** Care, transport, or both. */
  requestType: z.enum(REQUEST_TYPES),
  /** Specific NDIS service lines requested. */
  serviceTypes: z.array(z.enum(SERVICE_TYPES)).default([]),
  urgency: z.enum(URGENCY_LEVELS).default("standard"),

  // ── Location ─────────────────────────────────────────────────────────
  /** Pickup / service delivery point (defaults to participant home). */
  location: coordinatesSchema.optional(),
  /** Drop-off point — only relevant for transport requests. */
  destination: coordinatesSchema.optional(),
  /** Maximum acceptable distance from location in km. */
  maxDistanceKm: z.number().positive().max(500).default(25),

  // ── Timing ───────────────────────────────────────────────────────────
  preferredStart: z.coerce.date().optional(),
  preferredEnd: z.coerce.date().optional(),

  // ── Constraints ──────────────────────────────────────────────────────
  requirements: matchRequirementsSchema.optional(),

  /** Coordinator's free-text context the AI captured. */
  notes: z.string().max(5000).optional(),
});

export type MatchSpec = z.infer<typeof matchSpecSchema>;
