-- 0006_calendar_events.sql — Calendar events for bookings + availability views.
--
-- Provides a unified calendar representation that coordinators and
-- participants query. Each event is derived from either a booking or an
-- availability slot but stored as a materialised row so calendar queries
-- are fast (no joins across bookings + availability at read time).
--
-- event_source tells the UI how to render the entry and which detail
-- page to link to.

BEGIN;

CREATE TABLE calendar_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who this event belongs to (the person whose calendar it appears on)
  user_id           uuid REFERENCES users(id) ON DELETE CASCADE,
  organisation_id   uuid,
  worker_id         uuid,
  vehicle_id        uuid,
  participant_profile_id uuid,

  -- What kind of event
  event_type        text NOT NULL
                      CHECK (event_type IN (
                        'booking',
                        'availability',
                        'block',
                        'hold',
                        'reminder'
                      )),

  -- Where this event came from
  source_type       text NOT NULL
                      CHECK (source_type IN (
                        'booking',
                        'availability_slot',
                        'manual'
                      )),
  source_id         uuid,             -- FK to bookings.id or availability_slots.id

  -- Time window
  starts_at         timestamptz NOT NULL,
  ends_at           timestamptz NOT NULL,
  all_day           boolean NOT NULL DEFAULT false,
  recurrence_rule   text,             -- iCal RRULE

  -- Display
  title             text NOT NULL,
  description       text,
  status            text NOT NULL DEFAULT 'confirmed'
                      CHECK (status IN (
                        'tentative', 'confirmed', 'cancelled'
                      )),
  color             text,             -- UI hint: hex or named color

  -- Lifecycle
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT calendar_events_time_check CHECK (ends_at > starts_at OR all_day)
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX idx_cal_events_user_id        ON calendar_events (user_id);
CREATE INDEX idx_cal_events_org_id         ON calendar_events (organisation_id);
CREATE INDEX idx_cal_events_worker_id      ON calendar_events (worker_id);
CREATE INDEX idx_cal_events_participant    ON calendar_events (participant_profile_id);
CREATE INDEX idx_cal_events_type           ON calendar_events (event_type);
CREATE INDEX idx_cal_events_source         ON calendar_events (source_type, source_id);
CREATE INDEX idx_cal_events_status         ON calendar_events (status);
CREATE INDEX idx_cal_events_starts_at      ON calendar_events (starts_at);
CREATE INDEX idx_cal_events_time_range     ON calendar_events (starts_at, ends_at);
CREATE INDEX idx_cal_events_updated_at     ON calendar_events (updated_at);

-- ── updated_at trigger ─────────────────────────────────────────────────────

CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY cal_events_own_user ON calendar_events
  FOR ALL USING (user_id = rls_user_id());

CREATE POLICY cal_events_own_participant ON calendar_events
  FOR SELECT USING (
    participant_profile_id IN (
      SELECT id FROM participant_profiles WHERE user_id = rls_user_id()
    )
  );

CREATE POLICY cal_events_worker ON calendar_events
  FOR SELECT USING (
    worker_id IN (SELECT id FROM workers WHERE user_id = rls_user_id())
  );

CREATE POLICY cal_events_org ON calendar_events
  FOR ALL USING (
    rls_role() = 'provider_admin' AND organisation_id = rls_org_id()
  );

CREATE POLICY cal_events_broad ON calendar_events
  FOR ALL USING (rls_is_broad_role());

COMMIT;
