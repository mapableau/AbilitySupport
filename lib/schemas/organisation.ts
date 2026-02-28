/**
 * lib/schemas/organisation.ts — Zod schemas for organisations (Care + Transport).
 *
 * Replaces the earlier provider.ts scaffold. "Organisation" is the canonical
 * term matching the DB table and the NDIS registration model.
 */

import { z } from "zod";
import { addressSchema, coordinatesSchema, uuidSchema } from "./common.js";
import { ORG_TYPES, SERVICE_TYPES, CLAIM_STATUSES } from "./enums.js";

// ── Create / Update ────────────────────────────────────────────────────────

export const createOrganisationSchema = z.object({
  name: z.string().min(1).max(300),
  /** 11-digit Australian Business Number. */
  abn: z
    .string()
    .regex(/^\d{11}$/, "Must be an 11-digit ABN")
    .optional(),
  orgType: z.enum(ORG_TYPES),
  serviceTypes: z.array(z.enum(SERVICE_TYPES)).min(1),
  location: coordinatesSchema.optional(),
  address: addressSchema.optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(20).optional(),
  website: z.string().url().optional(),
});

export const updateOrganisationSchema = createOrganisationSchema.partial();

export type CreateOrganisationInput = z.infer<typeof createOrganisationSchema>;
export type UpdateOrganisationInput = z.infer<typeof updateOrganisationSchema>;

// ── OrganisationProfile (public read shape) ────────────────────────────────

/**
 * Public-facing profile returned by search results and detail pages.
 * Excludes internal fields (claim status, admin notes).
 */
export const organisationProfileSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  abn: z.string().nullable(),
  orgType: z.enum(ORG_TYPES),
  serviceTypes: z.array(z.enum(SERVICE_TYPES)),
  location: coordinatesSchema.nullable(),
  address: addressSchema.nullable(),
  contactEmail: z.string().email().nullable(),
  contactPhone: z.string().nullable(),
  website: z.string().url().nullable(),
  /** Has the organisation passed verification (ABN check, insurance, etc.)? */
  verified: z.boolean(),
  active: z.boolean(),
  /** Number of active workers — enriched at query time, not stored. */
  workerCount: z.number().int().nonnegative().optional(),
  /** Average recommendation score across past bookings. */
  avgScore: z.number().nonnegative().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type OrganisationProfile = z.infer<typeof organisationProfileSchema>;

// ── Organisation Claim ─────────────────────────────────────────────────────

export const createOrgClaimSchema = z.object({
  organisationId: uuidSchema,
  /** URL to uploaded evidence (ABN certificate, insurance doc, etc.). */
  evidenceUrl: z.string().url().optional(),
  notes: z.string().max(2000).optional(),
});

export const reviewOrgClaimSchema = z.object({
  status: z.enum(CLAIM_STATUSES).exclude(["pending"]),
  notes: z.string().max(2000).optional(),
});

export type CreateOrgClaimInput = z.infer<typeof createOrgClaimSchema>;
export type ReviewOrgClaimInput = z.infer<typeof reviewOrgClaimSchema>;
