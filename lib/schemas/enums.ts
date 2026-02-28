/**
 * lib/schemas/enums.ts — Shared `as const` value arrays.
 *
 * Single source of truth for every enumerated value in the system.
 * These arrays drive:
 *   - Postgres CHECK constraints (0001_core.sql)
 *   - Zod validation schemas (this package)
 *   - UI select/dropdown options
 *   - Typesense facet values
 *
 * Convention:
 *   - Array name: SCREAMING_SNAKE plural (e.g. RISK_TIERS)
 *   - Type name:  PascalCase singular  (e.g. RiskTier)
 *   - Keep alphabetical within each group
 */

// ── Identity & Access ──────────────────────────────────────────────────────

export const USER_ROLES = [
  "admin",
  "coordinator",
  "participant",
  "provider_admin",
  "worker",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ── Organisations ──────────────────────────────────────────────────────────

export const ORG_TYPES = ["care", "transport", "both"] as const;
export type OrgType = (typeof ORG_TYPES)[number];

export const SERVICE_TYPES = [
  "community_access",
  "personal_care",
  "plan_management",
  "therapy",
  "transport",
] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const CLAIM_STATUSES = ["pending", "approved", "rejected"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

// ── Participants ───────────────────────────────────────────────────────────

export const AU_STATES = [
  "ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA",
] as const;
export type AuState = (typeof AU_STATES)[number];

export const GENDER_PREFERENCES = [
  "female",
  "male",
  "no_preference",
  "non_binary",
] as const;
export type GenderPreference = (typeof GENDER_PREFERENCES)[number];

export const COMMUNICATION_METHODS = [
  "app",
  "email",
  "phone",
  "sms",
] as const;
export type CommunicationMethod = (typeof COMMUNICATION_METHODS)[number];

export const CONSENT_TYPES = [
  "data_sharing",
  "medical_info",
  "plan_management",
  "service_agreement",
  "transport",
] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

// ── Risk ───────────────────────────────────────────────────────────────────

export const RISK_TIERS = [
  "low",
  "standard",
  "elevated",
  "high",
  "critical",
] as const;
export type RiskTier = (typeof RISK_TIERS)[number];

export const RISK_FLAG_CATEGORIES = [
  "compliance",
  "safety",
  "service_gap",
] as const;
export type RiskFlagCategory = (typeof RISK_FLAG_CATEGORIES)[number];

// ── Workers ────────────────────────────────────────────────────────────────

export const WORKER_ROLES = [
  "coordinator",
  "driver",
  "support_worker",
  "therapist",
] as const;
export type WorkerRole = (typeof WORKER_ROLES)[number];

export const CLEARANCE_STATUSES = [
  "cleared",
  "expired",
  "pending",
  "revoked",
] as const;
export type ClearanceStatus = (typeof CLEARANCE_STATUSES)[number];

/** Capabilities are independent of worker_role — a support_worker can also drive. */
export const WORKER_CAPABILITIES = [
  "community_access",
  "driving",
  "manual_handling",
  "medication_administration",
  "personal_care",
  "positive_behaviour_support",
  "therapy_assistant",
  "wheelchair_transfer",
] as const;
export type WorkerCapability = (typeof WORKER_CAPABILITIES)[number];

// ── Vehicles ───────────────────────────────────────────────────────────────

export const VEHICLE_TYPES = [
  "minibus",
  "sedan",
  "suv",
  "van",
  "wheelchair_accessible",
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

// ── Coordination ───────────────────────────────────────────────────────────

export const REQUEST_TYPES = ["care", "transport", "both"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const URGENCY_LEVELS = [
  "low",
  "standard",
  "urgent",
  "emergency",
] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export const COORDINATION_STATUSES = [
  "open",
  "matching",
  "matched",
  "booked",
  "completed",
  "cancelled",
] as const;
export type CoordinationStatus = (typeof COORDINATION_STATUSES)[number];

// ── Recommendations ────────────────────────────────────────────────────────

export const RECOMMENDATION_STATUSES = [
  "accepted",
  "expired",
  "pending",
  "rejected",
] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

/** How confident the system is that the recommendation is a good fit. */
export const CONFIDENCE_LEVELS = [
  "verified",
  "likely",
  "needs_verification",
] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

// ── Bookings ───────────────────────────────────────────────────────────────

export const BOOKING_STATUSES = [
  "cancelled",
  "confirmed",
  "completed",
  "in_progress",
  "no_show",
  "pending",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// ── Follow-ups ─────────────────────────────────────────────────────────────

export const FOLLOWUP_TYPES = [
  "check_in",
  "complaint",
  "feedback",
  "incident_report",
  "quality_review",
] as const;
export type FollowupType = (typeof FOLLOWUP_TYPES)[number];

export const FOLLOWUP_STATUSES = [
  "escalated",
  "in_progress",
  "open",
  "resolved",
] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

export const FOLLOWUP_PRIORITIES = [
  "critical",
  "high",
  "low",
  "normal",
] as const;
export type FollowupPriority = (typeof FOLLOWUP_PRIORITIES)[number];
