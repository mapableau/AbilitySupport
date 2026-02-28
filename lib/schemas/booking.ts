/**
 * lib/schemas/booking.ts — Zod schemas for bookings / appointments.
 *
 * A booking links a participant to a provider for a time window.
 * Status transitions: pending → confirmed → in_progress → completed | cancelled.
 */

// TODO: uncomment once zod is installed
// import { z } from "zod";
//
// export const bookingStatusEnum = z.enum([
//   "pending",
//   "confirmed",
//   "in_progress",
//   "completed",
//   "cancelled",
// ]);
//
// export const createBookingSchema = z.object({
//   participantId: z.string().uuid(),
//   providerId: z.string().uuid(),
//   startsAt: z.coerce.date(),
//   endsAt: z.coerce.date(),
//   notes: z.string().max(2000).optional(),
// }).refine((b) => b.endsAt > b.startsAt, {
//   message: "endsAt must be after startsAt",
//   path: ["endsAt"],
// });
//
// export type CreateBookingInput = z.infer<typeof createBookingSchema>;
// export type BookingStatus = z.infer<typeof bookingStatusEnum>;

export {};
