/**
 * lib/schemas/booking.ts — Zod schemas for bookings / appointments.
 *
 * A booking links a participant to an organisation (+ optional worker/vehicle)
 * for a time window. Status transitions:
 *   pending → confirmed → in_progress → completed
 *                                     → cancelled
 *                                     → no_show
 */

import { z } from "zod";
import { uuidSchema } from "./common.js";
import { BOOKING_STATUSES } from "./enums.js";

// ── Create / Update ────────────────────────────────────────────────────────

export const createBookingSchema = z
  .object({
    coordinationRequestId: uuidSchema.optional(),
    recommendationId: uuidSchema.optional(),
    participantProfileId: uuidSchema,
    organisationId: uuidSchema,
    workerId: uuidSchema.optional(),
    vehicleId: uuidSchema.optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    notes: z.string().max(5000).optional(),
  })
  .refine((b) => b.endsAt > b.startsAt, {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });

export const updateBookingSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  workerId: uuidSchema.optional(),
  vehicleId: uuidSchema.optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  cancellationReason: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

// ── Read shape ─────────────────────────────────────────────────────────────

export const bookingSchema = z.object({
  id: uuidSchema,
  coordinationRequestId: uuidSchema.nullable(),
  recommendationId: uuidSchema.nullable(),
  participantProfileId: uuidSchema,
  organisationId: uuidSchema,
  workerId: uuidSchema.nullable(),
  vehicleId: uuidSchema.nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  status: z.enum(BOOKING_STATUSES),
  cancellationReason: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Booking = z.infer<typeof bookingSchema>;
