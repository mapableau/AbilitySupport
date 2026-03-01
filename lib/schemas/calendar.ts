/**
 * lib/schemas/calendar.ts — Zod schemas for calendar events.
 *
 * Calendar events are a unified view over bookings and availability slots.
 * Coordinators and participants see these in their calendar UI.
 */

import { z } from "zod";
import { uuidSchema } from "./common.js";

export const CALENDAR_EVENT_TYPES = [
  "booking",
  "availability",
  "block",
  "hold",
  "reminder",
] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export const CALENDAR_SOURCE_TYPES = [
  "booking",
  "availability_slot",
  "manual",
] as const;
export type CalendarSourceType = (typeof CALENDAR_SOURCE_TYPES)[number];

export const CALENDAR_STATUSES = [
  "tentative",
  "confirmed",
  "cancelled",
] as const;
export type CalendarStatus = (typeof CALENDAR_STATUSES)[number];

export const createCalendarEventSchema = z
  .object({
    userId: uuidSchema.optional(),
    organisationId: uuidSchema.optional(),
    workerId: uuidSchema.optional(),
    vehicleId: uuidSchema.optional(),
    participantProfileId: uuidSchema.optional(),
    eventType: z.enum(CALENDAR_EVENT_TYPES),
    sourceType: z.enum(CALENDAR_SOURCE_TYPES),
    sourceId: uuidSchema.optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    allDay: z.boolean().default(false),
    recurrenceRule: z.string().max(500).optional(),
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    status: z.enum(CALENDAR_STATUSES).default("confirmed"),
    color: z.string().max(20).optional(),
  })
  .refine((e) => e.allDay || e.endsAt > e.startsAt, {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });

export const calendarEventSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema.nullable(),
  organisationId: uuidSchema.nullable(),
  workerId: uuidSchema.nullable(),
  vehicleId: uuidSchema.nullable(),
  participantProfileId: uuidSchema.nullable(),
  eventType: z.enum(CALENDAR_EVENT_TYPES),
  sourceType: z.enum(CALENDAR_SOURCE_TYPES),
  sourceId: uuidSchema.nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  allDay: z.boolean(),
  recurrenceRule: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(CALENDAR_STATUSES),
  color: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
export type CalendarEvent = z.infer<typeof calendarEventSchema>;

/** Query parameters for listing calendar events. */
export const calendarQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  workerId: uuidSchema.optional(),
  organisationId: uuidSchema.optional(),
  participantProfileId: uuidSchema.optional(),
  eventType: z.enum(CALENDAR_EVENT_TYPES).optional(),
});

export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
