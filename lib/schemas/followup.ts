/**
 * lib/schemas/followup.ts — Zod schemas for follow-up responses.
 */

import { z } from "zod";
import { uuidSchema } from "./common.js";
import { FOLLOWUP_TYPES, FOLLOWUP_STATUSES, FOLLOWUP_PRIORITIES } from "./enums.js";

export const followupResponseSchema = z.object({
  /** 1–5 rating of the service experience. */
  rating: z.number().int().min(1).max(5),
  /** Free-text comment from the participant/coordinator. */
  comment: z.string().max(5000).optional(),
  /** Did the service meet accessibility requirements? */
  accessibilityMatch: z.boolean(),
  /** Would the participant use this provider again? */
  wouldUseAgain: z.boolean(),
  /** Specific issue categories flagged. */
  issues: z.array(z.string().max(200)).default([]),
});

export type FollowupResponseInput = z.infer<typeof followupResponseSchema>;

export const followupSchema = z.object({
  id: uuidSchema,
  bookingId: uuidSchema,
  createdBy: uuidSchema,
  followupType: z.enum(FOLLOWUP_TYPES),
  status: z.enum(FOLLOWUP_STATUSES),
  priority: z.enum(FOLLOWUP_PRIORITIES),
  summary: z.string().nullable(),
  details: z.string().nullable(),
  resolvedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Followup = z.infer<typeof followupSchema>;
