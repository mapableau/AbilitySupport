import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  doublePrecision,
  jsonb,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// participants — NDIS participants receiving support services
// ---------------------------------------------------------------------------

export const participants = pgTable("participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  ndisNumber: text("ndis_number"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// providers — Care + Transport service providers
// ---------------------------------------------------------------------------

export const providers = pgTable("providers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  abn: text("abn"),
  serviceTypes: jsonb("service_types").$type<string[]>().default([]).notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// bookings — links a participant to a provider for a time window
// ---------------------------------------------------------------------------

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  participantId: uuid("participant_id")
    .references(() => participants.id)
    .notNull(),
  providerId: uuid("provider_id")
    .references(() => providers.id)
    .notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: text("status").default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
