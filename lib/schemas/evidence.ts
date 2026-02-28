/**
 * lib/schemas/evidence.ts — Zod schemas for evidence references.
 *
 * Evidence refs attach verifiable proof (URLs, snippets, documents)
 * to organisations or workers. Sources include provider uploads,
 * coordinator manual entries, and system-automated captures.
 */

import { z } from "zod";
import { uuidSchema } from "./common.js";

// ── Enums ──────────────────────────────────────────────────────────────────

export const EVIDENCE_ENTITY_TYPES = ["organisation", "worker"] as const;
export type EvidenceEntityType = (typeof EVIDENCE_ENTITY_TYPES)[number];

export const EVIDENCE_CATEGORIES = [
  "abn_certificate",
  "insurance",
  "clearance",
  "qualification",
  "capability_proof",
  "accessibility_audit",
  "website_claim",
  "coordinator_note",
  "other",
] as const;
export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number];

export const EVIDENCE_SOURCES = [
  "provider_upload",
  "coordinator_manual",
  "system_automated",
  "participant_report",
] as const;
export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

// ── Create ─────────────────────────────────────────────────────────────────

export const createEvidenceRefSchema = z.object({
  entityType: z.enum(EVIDENCE_ENTITY_TYPES),
  entityId: uuidSchema,
  category: z.enum(EVIDENCE_CATEGORIES),
  title: z.string().min(1).max(500),
  url: z.string().url().max(2000).optional(),
  snippet: z.string().max(5000).optional(),
  capturedAt: z.coerce.date().optional(),
  source: z.enum(EVIDENCE_SOURCES).default("coordinator_manual"),
});

export type CreateEvidenceRefInput = z.infer<typeof createEvidenceRefSchema>;

// ── Update ─────────────────────────────────────────────────────────────────

export const updateEvidenceRefSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  url: z.string().url().max(2000).optional(),
  snippet: z.string().max(5000).optional(),
  capturedAt: z.coerce.date().optional(),
  verified: z.boolean().optional(),
});

export type UpdateEvidenceRefInput = z.infer<typeof updateEvidenceRefSchema>;

// ── Read ───────────────────────────────────────────────────────────────────

export const evidenceRefSchema = z.object({
  id: uuidSchema,
  entityType: z.enum(EVIDENCE_ENTITY_TYPES),
  entityId: uuidSchema,
  category: z.enum(EVIDENCE_CATEGORIES),
  title: z.string(),
  url: z.string().nullable(),
  snippet: z.string().nullable(),
  capturedAt: z.coerce.date().nullable(),
  source: z.enum(EVIDENCE_SOURCES),
  submittedBy: uuidSchema.nullable(),
  verified: z.boolean(),
  verifiedBy: uuidSchema.nullable(),
  verifiedAt: z.coerce.date().nullable(),
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type EvidenceRef = z.infer<typeof evidenceRefSchema>;
