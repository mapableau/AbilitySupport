/**
 * lib/schemas/worker.ts — Zod schemas for support workers.
 *
 * Key design: worker_role and capabilities are independent axes.
 * A worker with role "support_worker" can also hold the "driving"
 * capability — modelling the common "support worker who drives" case
 * without creating a dedicated role for every combination.
 *
 * Role    = what the worker is hired as (pay grade, responsibility)
 * Capability = what the worker can physically do on a shift
 */

import { z } from "zod";
import { uuidSchema } from "./common.js";
import {
  WORKER_ROLES,
  WORKER_CAPABILITIES,
  CLEARANCE_STATUSES,
} from "./enums.js";

// ── Create / Update ────────────────────────────────────────────────────────

export const createWorkerSchema = z.object({
  /** Optional — linked when the worker also has a platform login. */
  userId: uuidSchema.optional(),
  organisationId: uuidSchema,
  fullName: z.string().min(1).max(200),
  /** Primary employment role. */
  workerRole: z.enum(WORKER_ROLES).default("support_worker"),
  /**
   * What this worker can do, independent of their role title.
   * A "support_worker" with ["personal_care", "driving"] can provide
   * care AND drive the participant — no need for a second worker.
   */
  capabilities: z.array(z.enum(WORKER_CAPABILITIES)).default([]),
  /** Free-form qualifications stored as JSON (cert names, expiry dates). */
  qualifications: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        issuedBy: z.string().max(200).optional(),
        expiresAt: z.coerce.date().optional(),
      }),
    )
    .default([]),
  clearanceStatus: z.enum(CLEARANCE_STATUSES).default("pending"),
  clearanceExpiry: z.coerce.date().optional(),
});

export const updateWorkerSchema = createWorkerSchema
  .partial()
  .omit({ organisationId: true });

export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>;

// ── WorkerProfile (read shape) ─────────────────────────────────────────────

/**
 * Full worker profile as returned by API reads and search results.
 * Includes computed/derived fields not present at creation time.
 */
export const workerProfileSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema.nullable(),
  organisationId: uuidSchema,
  organisationName: z.string().optional(),
  fullName: z.string(),
  workerRole: z.enum(WORKER_ROLES),
  capabilities: z.array(z.enum(WORKER_CAPABILITIES)),
  qualifications: z.array(
    z.object({
      name: z.string(),
      issuedBy: z.string().nullable().optional(),
      expiresAt: z.coerce.date().nullable().optional(),
    }),
  ),
  clearanceStatus: z.enum(CLEARANCE_STATUSES),
  clearanceExpiry: z.coerce.date().nullable(),
  active: z.boolean(),
  /**
   * Convenience flag: true when role is "support_worker" AND capabilities
   * include "driving". Lets UI show a single badge instead of two.
   */
  canDrive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type WorkerProfile = z.infer<typeof workerProfileSchema>;

/**
 * Derive the canDrive flag from role + capabilities.
 * Call this when hydrating a WorkerProfile from raw DB/API data.
 */
export function deriveCanDrive(
  role: (typeof WORKER_ROLES)[number],
  capabilities: readonly (typeof WORKER_CAPABILITIES)[number][],
): boolean {
  return (
    (role === "support_worker" || role === "driver") &&
    capabilities.includes("driving")
  );
}
