/**
 * lib/schemas/common.ts — Shared Zod primitives.
 *
 * Reusable atoms (coordinates, address, pagination) composed by
 * multiple domain schemas. Keep this file lean — if a type is only
 * used in one domain, define it in that domain file.
 */

import { z } from "zod";
import { AU_STATES } from "./enums.js";

// ── Coordinates ────────────────────────────────────────────────────────────

/** A WGS 84 point — matches geography(Point, 4326) in Postgres. */
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type Coordinates = z.infer<typeof coordinatesSchema>;

// ── Address ────────────────────────────────────────────────────────────────

/** Australian street address with optional geocoded coordinates. */
export const addressSchema = z.object({
  line1: z.string().min(1).max(300),
  line2: z.string().max(300).optional(),
  suburb: z.string().min(1).max(100),
  state: z.enum(AU_STATES),
  postcode: z.string().regex(/^\d{4}$/, "Must be a 4-digit Australian postcode"),
  coordinates: coordinatesSchema.optional(),
});

export type Address = z.infer<typeof addressSchema>;

// ── Pagination ─────────────────────────────────────────────────────────────

/** Cursor-free page/perPage pagination for list endpoints. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

// ── Time window ────────────────────────────────────────────────────────────

/** A start/end time pair used by bookings, availability, and match specs. */
export const timeWindowSchema = z
  .object({
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((w) => w.endsAt > w.startsAt, {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });

export type TimeWindow = z.infer<typeof timeWindowSchema>;

// ── UUID helper ────────────────────────────────────────────────────────────

/** Reusable uuid string validator. */
export const uuidSchema = z.string().uuid();
