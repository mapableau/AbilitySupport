/**
 * lib/schemas/participant.ts — Zod schemas for NDIS participant profiles
 * and preferences.
 *
 * Used in:
 *   - API route input validation (create/update participant)
 *   - Form validation on the client (react-hook-form + zodResolver)
 *   - Type inference throughout the app via z.infer<>
 */

import { z } from "zod";
import { addressSchema, coordinatesSchema, uuidSchema } from "./common.js";
import {
  COMMUNICATION_METHODS,
  GENDER_PREFERENCES,
  RISK_TIERS,
} from "./enums.js";

// ── Participant Profile ────────────────────────────────────────────────────

export const createParticipantProfileSchema = z.object({
  /** Internal user id from the users table. */
  userId: uuidSchema,
  fullName: z.string().min(1).max(200),
  /** 9-digit NDIS participant number. */
  ndisNumber: z
    .string()
    .regex(/^\d{9}$/, "Must be a 9-digit NDIS number")
    .optional(),
  dateOfBirth: z.coerce.date().optional(),
  /** Geocoded home point for proximity search (PostGIS geography). */
  homeLocation: coordinatesSchema.optional(),
  address: addressSchema.optional(),
  planStartDate: z.coerce.date().optional(),
  planEndDate: z.coerce.date().optional(),
  /** Budget in cents to avoid floating-point rounding. */
  planBudgetCents: z.number().int().nonnegative().optional(),
  notes: z.string().max(5000).optional(),
});

export const updateParticipantProfileSchema =
  createParticipantProfileSchema.partial().omit({ userId: true });

export type CreateParticipantProfileInput = z.infer<
  typeof createParticipantProfileSchema
>;
export type UpdateParticipantProfileInput = z.infer<
  typeof updateParticipantProfileSchema
>;

// ── Participant Profile (read — includes computed fields) ──────────────────

export const participantProfileSchema = createParticipantProfileSchema.extend({
  id: uuidSchema,
  riskTier: z.enum(RISK_TIERS),
  riskScore: z.number().int().nonnegative(),
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ParticipantProfile = z.infer<typeof participantProfileSchema>;

// ── Participant Preferences ────────────────────────────────────────────────

export const participantPreferencesSchema = z.object({
  participantProfileId: uuidSchema,
  preferredLanguage: z.string().min(2).max(10).default("en"),
  genderPreference: z.enum(GENDER_PREFERENCES).optional(),
  communicationMethod: z.enum(COMMUNICATION_METHODS).default("phone"),
  requiresWheelchairAccess: z.boolean().default(false),
  /** Max acceptable one-way travel time in minutes. */
  maxTravelMinutes: z.number().int().positive().max(180).optional(),
  /** Free-form JSON for service-specific prefs (e.g. dietary, cultural). */
  servicePreferences: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().max(2000).optional(),
});

export const updateParticipantPreferencesSchema =
  participantPreferencesSchema.partial().omit({ participantProfileId: true });

export type ParticipantPreferences = z.infer<
  typeof participantPreferencesSchema
>;
export type UpdateParticipantPreferencesInput = z.infer<
  typeof updateParticipantPreferencesSchema
>;
