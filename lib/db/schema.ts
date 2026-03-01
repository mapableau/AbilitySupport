/**
 * lib/db/schema.ts — Drizzle ORM table definitions.
 *
 * These mirror the SQL tables in db/migrations/0001_core.sql and
 * 0003_audit_log.sql. Drizzle Kit uses this file to generate
 * migration diffs (`pnpm db:generate`) and power type-safe queries.
 *
 * Only the core identity/compliance tables are defined here.
 * Domain-specific tables (organisations, workers, bookings, etc.)
 * will be added as the Drizzle migration path catches up with the
 * hand-authored SQL migrations in db/migrations/.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  inet,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ═══════════════════════════════════════════════════════════════════════════
// users — synced from Clerk; internal uuid PK for FK consistency
// ═══════════════════════════════════════════════════════════════════════════

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").unique().notNull(),
  email: text("email").unique().notNull(),
  fullName: text("full_name").notNull(),
  avatarUrl: text("avatar_url"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_users_clerk_id").on(t.clerkId),
  index("idx_users_email").on(t.email),
  index("idx_users_updated_at").on(t.updatedAt),
]);

// ═══════════════════════════════════════════════════════════════════════════
// roles — RBAC assignments; organisation_id nullable for global roles
// ═══════════════════════════════════════════════════════════════════════════

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role").notNull(),
  organisationId: uuid("organisation_id"),
  grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("roles_user_role_org_unique").on(t.userId, t.role, t.organisationId),
  index("idx_roles_user_id").on(t.userId),
  index("idx_roles_organisation_id").on(t.organisationId),
  index("idx_roles_role").on(t.role),
]);

// ═══════════════════════════════════════════════════════════════════════════
// consents — NDIS consent records with temporal validity
// ═══════════════════════════════════════════════════════════════════════════

export const consents = pgTable("consents", {
  id: uuid("id").defaultRandom().primaryKey(),
  participantProfileId: uuid("participant_profile_id").notNull(),
  consentType: text("consent_type").notNull(),
  grantedBy: uuid("granted_by").references(() => users.id).notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  documentUrl: text("document_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_consents_profile_id").on(t.participantProfileId),
  index("idx_consents_consent_type").on(t.consentType),
  index("idx_consents_granted_by").on(t.grantedBy),
]);

// ═══════════════════════════════════════════════════════════════════════════
// audit_log — immutable append-only log of data access and mutations
// ═══════════════════════════════════════════════════════════════════════════

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  clerkId: text("clerk_id"),
  ipAddress: inet("ip_address"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  summary: text("summary").notNull(),
  diff: jsonb("diff"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_audit_log_user_id").on(t.userId),
  index("idx_audit_log_action").on(t.action),
  index("idx_audit_log_entity").on(t.entityType, t.entityId),
  index("idx_audit_log_created_at").on(t.createdAt),
]);
