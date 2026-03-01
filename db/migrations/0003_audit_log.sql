-- 0003_audit_log.sql — Immutable audit log for data access and mutations.
--
-- Records who did what, to which entity, and when. Used for:
--   - NDIS compliance auditing
--   - Consent verification (proof that access was authorised)
--   - Incident investigation (who viewed participant data)
--   - Change history (what changed on a record)
--
-- Design:
--   - Append-only: no UPDATE or DELETE allowed (enforced by RLS policy)
--   - action column uses CHECK constraint, not ENUM
--   - entity_type + entity_id is polymorphic (any table)
--   - diff stored as JSONB (old/new values for mutations)

BEGIN;

CREATE TABLE audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who performed the action
  user_id         uuid REFERENCES users(id),
  clerk_id        text,                         -- Clerk session ID for correlation
  ip_address      inet,

  -- What happened
  action          text NOT NULL
                    CHECK (action IN (
                      'create',
                      'read',
                      'update',
                      'delete',
                      'login',
                      'logout',
                      'consent_granted',
                      'consent_revoked',
                      'role_assigned',
                      'role_removed',
                      'export',
                      'escalation'
                    )),

  -- Which entity was affected
  entity_type     text NOT NULL,                -- e.g. 'participant_profiles', 'bookings'
  entity_id       uuid,                         -- PK of the affected row (null for login/logout)

  -- What changed
  summary         text NOT NULL,                -- human-readable description
  diff            jsonb,                        -- { before: {...}, after: {...} } for mutations
  metadata        jsonb,                        -- extra context (route, user-agent, etc.)

  -- Immutable timestamp — no updated_at on purpose
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX idx_audit_log_user_id     ON audit_log (user_id);
CREATE INDEX idx_audit_log_action      ON audit_log (action);
CREATE INDEX idx_audit_log_entity      ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at  ON audit_log (created_at);

-- Composite for "what did user X do in the last 24h" queries
CREATE INDEX idx_audit_log_user_time   ON audit_log (user_id, created_at DESC);

-- ── Prevent mutations on audit rows ────────────────────────────────────────
-- This trigger rejects UPDATE and DELETE on existing audit_log rows.
-- Append-only by design.

CREATE OR REPLACE FUNCTION prevent_audit_mutation()
  RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log rows are immutable — UPDATE and DELETE are not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

COMMIT;
