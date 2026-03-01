-- 0008_service_outcomes.sql — Post-service outcome capture.
--
-- Records the structured outcome of every completed booking.
-- Feeds into: reliability_score adjustments, needs profile updates,
-- continuity preferences, and emotional aftercare workflows.

BEGIN;

CREATE TABLE service_outcomes (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  participant_profile_id    uuid NOT NULL,
  organisation_id           uuid NOT NULL,
  worker_id                 uuid,

  -- Submitted by participant, coordinator, or worker
  submitted_by              uuid NOT NULL REFERENCES users(id),

  -- Core outcome fields
  comfort_rating            integer NOT NULL CHECK (comfort_rating BETWEEN 1 AND 5),
  accessibility_met         boolean NOT NULL,
  continuity_preference     text NOT NULL DEFAULT 'no_preference'
                              CHECK (continuity_preference IN (
                                'same_worker', 'same_org', 'no_preference', 'different_worker'
                              )),
  emotional_aftercare_needed boolean NOT NULL DEFAULT false,

  -- Structured feedback
  what_went_well            text,
  what_could_improve        text,
  safety_concerns           text,
  additional_needs_noted    text[] NOT NULL DEFAULT '{}',

  -- Signals for scoring pipeline
  would_use_again           boolean NOT NULL DEFAULT true,
  sentiment                 text NOT NULL DEFAULT 'positive'
                              CHECK (sentiment IN ('positive', 'neutral', 'negative')),

  -- Links
  followup_id               uuid REFERENCES followups(id),
  needs_profile_id          uuid,

  -- Lifecycle
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  UNIQUE (booking_id)
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX idx_outcomes_booking         ON service_outcomes (booking_id);
CREATE INDEX idx_outcomes_participant     ON service_outcomes (participant_profile_id);
CREATE INDEX idx_outcomes_organisation    ON service_outcomes (organisation_id);
CREATE INDEX idx_outcomes_worker          ON service_outcomes (worker_id);
CREATE INDEX idx_outcomes_submitted_by    ON service_outcomes (submitted_by);
CREATE INDEX idx_outcomes_comfort_rating  ON service_outcomes (comfort_rating);
CREATE INDEX idx_outcomes_accessibility   ON service_outcomes (accessibility_met);
CREATE INDEX idx_outcomes_continuity      ON service_outcomes (continuity_preference);
CREATE INDEX idx_outcomes_aftercare       ON service_outcomes (emotional_aftercare_needed);
CREATE INDEX idx_outcomes_sentiment       ON service_outcomes (sentiment);
CREATE INDEX idx_outcomes_created_at      ON service_outcomes (created_at);

-- ── Trigger ────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_service_outcomes_updated_at
  BEFORE UPDATE ON service_outcomes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE service_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY outcomes_participant ON service_outcomes
  FOR ALL USING (
    participant_profile_id IN (
      SELECT id FROM participant_profiles WHERE user_id = rls_user_id()
    )
  );

CREATE POLICY outcomes_worker ON service_outcomes
  FOR SELECT USING (
    worker_id IN (SELECT id FROM workers WHERE user_id = rls_user_id())
  );

CREATE POLICY outcomes_org ON service_outcomes
  FOR SELECT USING (
    rls_role() = 'provider_admin' AND organisation_id = rls_org_id()
  );

CREATE POLICY outcomes_broad ON service_outcomes
  FOR ALL USING (rls_is_broad_role());

COMMIT;
