/**
 * lib/db/schema.ts — Drizzle table definitions for MapAble.
 *
 * Convention: one table per domain entity exported as a named const.
 * PostGIS geometry columns use drizzle-orm/pg-core customType helpers.
 * pgvector embedding columns follow the same pattern.
 *
 * When this file grows beyond ~200 lines, split into:
 *   schema/participants.ts, schema/providers.ts, schema/bookings.ts
 * and re-export from a schema/index.ts barrel.
 */

// TODO: uncomment once drizzle-orm is installed
// import {
//   pgTable,
//   uuid,
//   text,
//   timestamp,
//   boolean,
//   doublePrecision,
//   jsonb,
// } from "drizzle-orm/pg-core";
//
// export const participants = pgTable("participants", {
//   id: uuid("id").defaultRandom().primaryKey(),
//   fullName: text("full_name").notNull(),
//   ndisNumber: text("ndis_number"),
//   active: boolean("active").default(true),
//   createdAt: timestamp("created_at").defaultNow(),
// });
//
// export const providers = pgTable("providers", {
//   id: uuid("id").defaultRandom().primaryKey(),
//   name: text("name").notNull(),
//   abn: text("abn"),
//   serviceTypes: jsonb("service_types").$type<string[]>(),
//   // PostGIS point — use customType when wiring up spatial queries
//   lat: doublePrecision("lat"),
//   lng: doublePrecision("lng"),
//   createdAt: timestamp("created_at").defaultNow(),
// });
//
// export const bookings = pgTable("bookings", {
//   id: uuid("id").defaultRandom().primaryKey(),
//   participantId: uuid("participant_id").references(() => participants.id),
//   providerId: uuid("provider_id").references(() => providers.id),
//   startsAt: timestamp("starts_at").notNull(),
//   endsAt: timestamp("ends_at").notNull(),
//   status: text("status").default("pending"),
//   createdAt: timestamp("created_at").defaultNow(),
// });

export {};
