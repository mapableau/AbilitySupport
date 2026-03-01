/**
 * lib/schemas/outcome.ts — Zod schemas for post-service outcome capture.
 */

import { z } from "zod";
import { uuidSchema } from "./common.js";

export const CONTINUITY_PREFERENCES = [
  "same_worker",
  "same_org",
  "no_preference",
  "different_worker",
] as const;
export type ContinuityPreference = (typeof CONTINUITY_PREFERENCES)[number];

export const createOutcomeSchema = z.object({
  bookingId: uuidSchema,
  participantProfileId: uuidSchema,
  organisationId: uuidSchema,
  workerId: uuidSchema.optional(),

  comfortRating: z.number().int().min(1).max(5),
  accessibilityMet: z.boolean(),
  continuityPreference: z.enum(CONTINUITY_PREFERENCES).default("no_preference"),
  emotionalAftercareNeeded: z.boolean().default(false),

  whatWentWell: z.string().max(5000).optional(),
  whatCouldImprove: z.string().max(5000).optional(),
  safetyConcerns: z.string().max(5000).optional(),
  additionalNeedsNoted: z.array(z.string().max(200)).default([]),

  wouldUseAgain: z.boolean().default(true),
});

export type CreateOutcomeInput = z.infer<typeof createOutcomeSchema>;

export const outcomeSchema = z.object({
  id: uuidSchema,
  bookingId: uuidSchema,
  participantProfileId: uuidSchema,
  organisationId: uuidSchema,
  workerId: uuidSchema.nullable(),
  submittedBy: uuidSchema,
  comfortRating: z.number().int().min(1).max(5),
  accessibilityMet: z.boolean(),
  continuityPreference: z.enum(CONTINUITY_PREFERENCES),
  emotionalAftercareNeeded: z.boolean(),
  whatWentWell: z.string().nullable(),
  whatCouldImprove: z.string().nullable(),
  safetyConcerns: z.string().nullable(),
  additionalNeedsNoted: z.array(z.string()),
  wouldUseAgain: z.boolean(),
  sentiment: z.string(),
  followupId: uuidSchema.nullable(),
  needsProfileId: uuidSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ServiceOutcome = z.infer<typeof outcomeSchema>;
