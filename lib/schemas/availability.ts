/**
 * lib/schemas/availability.ts — Zod schemas for availability slots.
 *
 * An availability slot marks when a worker or vehicle is available.
 * Slots support optional iCal RRULE recurrence for weekly patterns.
 */

import { z } from "zod";
import { uuidSchema } from "./common.js";

export const createAvailabilitySlotSchema = z
  .object({
    workerId: uuidSchema.optional(),
    vehicleId: uuidSchema.optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    recurrenceRule: z.string().max(500).optional(),
    isAvailable: z.boolean().default(true),
    notes: z.string().max(2000).optional(),
  })
  .refine((s) => s.workerId || s.vehicleId, {
    message: "Either workerId or vehicleId must be provided",
    path: ["workerId"],
  })
  .refine((s) => s.endsAt > s.startsAt, {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });

export const updateAvailabilitySlotSchema = z.object({
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  recurrenceRule: z.string().max(500).optional(),
  isAvailable: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export const availabilitySlotSchema = z.object({
  id: uuidSchema,
  workerId: uuidSchema.nullable(),
  vehicleId: uuidSchema.nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  recurrenceRule: z.string().nullable(),
  isAvailable: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CreateAvailabilitySlotInput = z.infer<typeof createAvailabilitySlotSchema>;
export type UpdateAvailabilitySlotInput = z.infer<typeof updateAvailabilitySlotSchema>;
export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;
