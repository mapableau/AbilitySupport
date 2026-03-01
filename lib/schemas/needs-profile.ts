/**
 * lib/schemas/needs-profile.ts — Zod schemas for dynamic needs profiles.
 *
 * A needs profile is a point-in-time snapshot of a participant's
 * functional needs, emotional state, urgency, activity goal, and
 * environmental context. The system captures many of these over time
 * to build a history that improves matching.
 */

import { z } from "zod";
import { uuidSchema } from "./common.js";
import {
  FUNCTIONAL_NEEDS,
  EMOTIONAL_STATES,
  NEEDS_URGENCY_LEVELS,
  ACTIVITY_GOALS,
} from "./enums.js";

// ── Context tag format ─────────────────────────────────────────────────────

/**
 * Context tags are free-form key:value strings.
 * Common prefixes: weather:, time:, transit:, location:
 */
const contextTagSchema = z.string().min(1).max(100);

// ── Create ─────────────────────────────────────────────────────────────────

export const createNeedsProfileSchema = z.object({
  participantId: uuidSchema,
  recordedBy: uuidSchema.optional(),

  functionalNeeds: z.array(z.enum(FUNCTIONAL_NEEDS)).default([]),
  emotionalState: z.enum(EMOTIONAL_STATES).default("calm"),
  urgencyLevel: z.enum(NEEDS_URGENCY_LEVELS).default("routine"),
  activityGoal: z.enum(ACTIVITY_GOALS).default("care"),
  contextTags: z.array(contextTagSchema).default([]),

  notes: z.string().max(5000).optional(),
});

export type CreateNeedsProfileInput = z.infer<typeof createNeedsProfileSchema>;

// ── Read ───────────────────────────────────────────────────────────────────

export const needsProfileSchema = z.object({
  id: uuidSchema,
  participantId: uuidSchema,
  recordedAt: z.coerce.date(),
  recordedBy: uuidSchema.nullable(),

  functionalNeeds: z.array(z.enum(FUNCTIONAL_NEEDS)),
  emotionalState: z.enum(EMOTIONAL_STATES),
  urgencyLevel: z.enum(NEEDS_URGENCY_LEVELS),
  activityGoal: z.enum(ACTIVITY_GOALS),
  contextTags: z.array(z.string()),

  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type NeedsProfile = z.infer<typeof needsProfileSchema>;

// ── Query (list snapshots for a participant) ───────────────────────────────

export const needsProfileQuerySchema = z.object({
  participantId: uuidSchema,
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type NeedsProfileQuery = z.infer<typeof needsProfileQuerySchema>;
