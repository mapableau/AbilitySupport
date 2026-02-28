/**
 * lib/evidence/types.ts — Row types for evidence_refs.
 */

export interface EvidenceRefRow {
  id: string;
  entity_type: string;
  entity_id: string;
  category: string;
  title: string;
  url: string | null;
  snippet: string | null;
  captured_at: string | null;
  source: string;
  submitted_by: string | null;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}
