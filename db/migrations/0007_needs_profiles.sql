-- 0007_needs_profiles.sql — Dynamic participant needs profiles.
--
-- A time-series table capturing how a participant's needs evolve.
-- Each row is a point-in-time snapshot — the system builds a history
-- that the AI uses to predict future needs and improve matching.
--
-- NOT a replacement for participant_profiles (which stores static NDIS
-- plan data). This captures *dynamic* state that changes session to
-- session: what they need right now, how they feel, what they want to do.

BEGIN;

CREATE TABLE needs_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      uuid NOT NULL
                        REFERENCES participant_profiles(id) ON DELETE CASCADE,

  -- When this snapshot was captured
  recorded_at         timestamptz NOT NULL DEFAULT now(),
  recorded_by         uuid REFERENCES users(id),

  -- Functional needs (what support is required)
  functional_needs    text[] NOT NULL DEFAULT '{}',
  --   Allowed values enforced at app layer (Zod) not DB CHECK:
  --   wheelchair, wheelchair_transfer, manual_handling, aac,
  --   sensory_support, medication_admin, personal_care,
  --   mobility_assistance, cognitive_support, hearing_support,
  --   vision_support, communication_support

  -- Emotional state (non-clinical flags, not diagnoses)
  emotional_state     text NOT NULL DEFAULT 'calm'
                        CHECK (emotional_state IN (
                          'calm', 'anxious', 'stressed', 'distressed',
                          'agitated', 'withdrawn', 'positive'
                        )),

  -- Urgency (how soon is support needed)
  urgency_level       text NOT NULL DEFAULT 'routine'
                        CHECK (urgency_level IN (
                          'routine', 'soon', 'urgent'
                        )),

  -- What the participant wants to do
  activity_goal       text NOT NULL DEFAULT 'care'
                        CHECK (activity_goal IN (
                          'care', 'transport', 'community_access',
                          'therapy', 'social', 'errands', 'medical'
                        )),

  -- Environmental context tags (free-form, stored as text array)
  context_tags        text[] NOT NULL DEFAULT '{}',
  --   Examples: weather:hot, weather:rain, time:morning, time:evening,
  --   transit:delays, transit:normal, location:home, location:clinic

  -- Optional notes from coordinator or participant
  notes               text,

  -- Lifecycle
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX idx_needs_profiles_participant
  ON needs_profiles (participant_id);
CREATE INDEX idx_needs_profiles_recorded_at
  ON needs_profiles (recorded_at DESC);
CREATE INDEX idx_needs_profiles_participant_time
  ON needs_profiles (participant_id, recorded_at DESC);
CREATE INDEX idx_needs_profiles_urgency
  ON needs_profiles (urgency_level);
CREATE INDEX idx_needs_profiles_emotional_state
  ON needs_profiles (emotional_state);
CREATE INDEX idx_needs_profiles_activity_goal
  ON needs_profiles (activity_goal);
CREATE INDEX idx_needs_profiles_functional_needs
  ON needs_profiles USING gin (functional_needs);
CREATE INDEX idx_needs_profiles_context_tags
  ON needs_profiles USING gin (context_tags);

-- ── updated_at trigger ─────────────────────────────────────────────────────

CREATE TRIGGER trg_needs_profiles_updated_at
  BEFORE UPDATE ON needs_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE needs_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY needs_profiles_self ON needs_profiles
  FOR ALL USING (
    participant_id IN (
      SELECT id FROM participant_profiles WHERE user_id = rls_user_id()
    )
  );

CREATE POLICY needs_profiles_broad ON needs_profiles
  FOR SELECT USING (rls_is_broad_role());

COMMIT;
