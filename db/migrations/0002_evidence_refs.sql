-- 0002_evidence_refs.sql — Evidence references for provider/worker verification.
--
-- Stores URLs, text snippets, and timestamps submitted by providers,
-- coordinators, or the system to support claims about capabilities,
-- qualifications, and compliance status.
--
-- Design:
--   • Polymorphic via entity_type + entity_id (organisation or worker)
--   • No aggressive scraping — stores only user/provider-submitted data
--   • Coordinators can add manual evidence via the review UI
--   • Each ref has a category, source attribution, and verification status

BEGIN;

CREATE TABLE evidence_refs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic target: which entity this evidence is attached to
  entity_type     text NOT NULL
                    CHECK (entity_type IN ('organisation', 'worker')),
  entity_id       uuid NOT NULL,

  -- What kind of evidence this is
  category        text NOT NULL
                    CHECK (category IN (
                      'abn_certificate',
                      'insurance',
                      'clearance',
                      'qualification',
                      'capability_proof',
                      'accessibility_audit',
                      'website_claim',
                      'coordinator_note',
                      'other'
                    )),

  -- The evidence itself
  title           text NOT NULL,
  url             text,                 -- link to external document, website, or blob
  snippet         text,                 -- relevant excerpt or coordinator's note
  captured_at     timestamptz,          -- when the evidence was captured/observed

  -- Source attribution
  source          text NOT NULL DEFAULT 'manual'
                    CHECK (source IN (
                      'provider_upload',
                      'coordinator_manual',
                      'system_automated',
                      'participant_report'
                    )),
  submitted_by    uuid REFERENCES users(id),

  -- Verification tracking
  verified        boolean NOT NULL DEFAULT false,
  verified_by     uuid REFERENCES users(id),
  verified_at     timestamptz,

  -- Lifecycle
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX idx_evidence_refs_entity
  ON evidence_refs (entity_type, entity_id);
CREATE INDEX idx_evidence_refs_category
  ON evidence_refs (category);
CREATE INDEX idx_evidence_refs_source
  ON evidence_refs (source);
CREATE INDEX idx_evidence_refs_verified
  ON evidence_refs (verified);
CREATE INDEX idx_evidence_refs_submitted_by
  ON evidence_refs (submitted_by);
CREATE INDEX idx_evidence_refs_active
  ON evidence_refs (active);
CREATE INDEX idx_evidence_refs_updated_at
  ON evidence_refs (updated_at);

-- ── updated_at trigger ─────────────────────────────────────────────────────

CREATE TRIGGER trg_evidence_refs_updated_at
  BEFORE UPDATE ON evidence_refs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
