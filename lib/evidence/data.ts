/**
 * lib/evidence/data.ts — Data access for evidence references.
 *
 * CRUD operations for evidence_refs, scoped by entity (org or worker).
 * All functions are stubbed — wire to real Drizzle queries once
 * lib/db/schema.ts includes the evidence_refs table.
 */

import type { EvidenceRefRow } from "./types.js";
import type { CreateEvidenceRefInput, UpdateEvidenceRefInput } from "../schemas/evidence.js";

export async function listEvidenceForEntity(
  entityType: string,
  entityId: string,
): Promise<EvidenceRefRow[]> {
  // TODO: SELECT * FROM evidence_refs
  //   WHERE entity_type = $1 AND entity_id = $2 AND active = true
  //   ORDER BY created_at DESC
  console.log(`[evidence] listEvidenceForEntity(${entityType}, ${entityId}) — stub`);
  return [];
}

export async function getEvidenceRef(id: string): Promise<EvidenceRefRow | null> {
  // TODO: SELECT * FROM evidence_refs WHERE id = $1 AND active = true
  console.log(`[evidence] getEvidenceRef(${id}) — stub`);
  return null;
}

export async function createEvidenceRef(
  input: CreateEvidenceRefInput,
  submittedBy: string,
): Promise<EvidenceRefRow> {
  // TODO: INSERT INTO evidence_refs (...) VALUES (...) RETURNING *
  console.log(`[evidence] createEvidenceRef(${input.entityType}/${input.entityId}) — stub`);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    entity_type: input.entityType,
    entity_id: input.entityId,
    category: input.category,
    title: input.title,
    url: input.url ?? null,
    snippet: input.snippet ?? null,
    captured_at: input.capturedAt?.toISOString() ?? null,
    source: input.source ?? "coordinator_manual",
    submitted_by: submittedBy,
    verified: false,
    verified_by: null,
    verified_at: null,
    active: true,
    created_at: now,
    updated_at: now,
  };
}

export async function updateEvidenceRef(
  id: string,
  input: UpdateEvidenceRefInput,
  verifiedBy?: string,
): Promise<EvidenceRefRow | null> {
  // TODO: UPDATE evidence_refs SET ... WHERE id = $1 AND active = true RETURNING *
  console.log(`[evidence] updateEvidenceRef(${id}) — stub`);
  void input;
  void verifiedBy;
  return null;
}

export async function verifyEvidenceRef(
  id: string,
  verifiedBy: string,
): Promise<boolean> {
  // TODO: UPDATE evidence_refs
  //   SET verified = true, verified_by = $2, verified_at = now(), updated_at = now()
  //   WHERE id = $1 AND active = true
  console.log(`[evidence] verifyEvidenceRef(${id}) by ${verifiedBy} — stub`);
  return true;
}

export async function deleteEvidenceRef(id: string): Promise<boolean> {
  // TODO: UPDATE evidence_refs SET active = false, updated_at = now() WHERE id = $1
  console.log(`[evidence] deleteEvidenceRef(${id}) — stub`);
  return true;
}

export async function countEvidenceForEntity(
  entityType: string,
  entityId: string,
): Promise<{ total: number; verified: number }> {
  // TODO: SELECT count(*), count(*) FILTER (WHERE verified) FROM evidence_refs
  //   WHERE entity_type = $1 AND entity_id = $2 AND active = true
  console.log(`[evidence] countEvidenceForEntity(${entityType}, ${entityId}) — stub`);
  return { total: 0, verified: 0 };
}
