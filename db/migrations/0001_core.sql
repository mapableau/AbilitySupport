-- 0001_core.sql — MapAble core schema
--
-- This migration creates the full domain model for the MapAble
-- support coordination platform. It replaces the initial Drizzle
-- scaffold tables with the production schema.
--
-- Design choices:
--   • CHECK constraints instead of Postgres ENUM types (easier to evolve)
--   • geography(Point, 4326) for spatial columns (true earth-distance math)
--   • All PKs are uuid DEFAULT gen_random_uuid()
--   • All tables carry created_at + updated_at (timestamptz)
--   • Indexes on every FK, every status/enum column, geo columns, and
--     updated_at (for Typesense delta-sync queries)

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- Extensions
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- belt-and-suspenders alongside gen_random_uuid()

-- ═══════════════════════════════════════════════════════════════════════════
-- Drop scaffold tables from the initial Drizzle migration (0000)
-- ═══════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS bookings   CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS providers   CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. IDENTITY & ACCESS
-- ═══════════════════════════════════════════════════════════════════════════

-- users — synced from Clerk; our own uuid PK for FK consistency
CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id    text UNIQUE NOT NULL,
  email       text UNIQUE NOT NULL,
  full_name   text NOT NULL,
  avatar_url  text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- roles — RBAC assignments; organisation_id is NULL for global roles
CREATE TABLE roles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            text NOT NULL
                    CHECK (role IN (
                      'admin',
                      'coordinator',
                      'participant',
                      'provider_admin',
                      'worker'
                    )),
  organisation_id uuid,  -- FK added after organisations table exists
  granted_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, organisation_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ORGANISATIONS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE organisations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  abn             text UNIQUE,
  org_type        text NOT NULL
                    CHECK (org_type IN ('care', 'transport', 'both')),
  service_types   jsonb NOT NULL DEFAULT '[]'::jsonb,
  location        geography(Point, 4326),
  address_line1   text,
  address_line2   text,
  suburb          text,
  state           text CHECK (state IN (
                    'ACT','NSW','NT','QLD','SA','TAS','VIC','WA'
                  )),
  postcode        text,
  contact_email   text,
  contact_phone   text,
  website         text,
  verified        boolean NOT NULL DEFAULT false,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Now add the deferred FK on roles
ALTER TABLE roles
  ADD CONSTRAINT roles_organisation_id_fk
    FOREIGN KEY (organisation_id)
    REFERENCES organisations(id)
    ON DELETE CASCADE;

-- organisation_claims — verification workflow for org ownership
CREATE TABLE organisation_claims (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  claimed_by      uuid NOT NULL REFERENCES users(id),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  evidence_url    text,
  reviewed_by     uuid REFERENCES users(id),
  reviewed_at     timestamptz,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. PARTICIPANTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE participant_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ndis_number     text UNIQUE,
  date_of_birth   date,
  home_location   geography(Point, 4326),
  address_line1   text,
  address_line2   text,
  suburb          text,
  state           text CHECK (state IN (
                    'ACT','NSW','NT','QLD','SA','TAS','VIC','WA'
                  )),
  postcode        text,
  plan_start_date date,
  plan_end_date   date,
  plan_budget_cents bigint,
  risk_tier       text NOT NULL DEFAULT 'standard'
                    CHECK (risk_tier IN (
                      'low', 'standard', 'elevated', 'high', 'critical'
                    )),
  risk_score      integer NOT NULL DEFAULT 0,
  active          boolean NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE participant_preferences (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_profile_id   uuid UNIQUE NOT NULL
                             REFERENCES participant_profiles(id) ON DELETE CASCADE,
  preferred_language       text NOT NULL DEFAULT 'en',
  gender_preference        text
                             CHECK (gender_preference IN (
                               'male', 'female', 'non_binary', 'no_preference'
                             )),
  communication_method     text NOT NULL DEFAULT 'phone'
                             CHECK (communication_method IN (
                               'phone', 'sms', 'email', 'app'
                             )),
  requires_wheelchair_access boolean NOT NULL DEFAULT false,
  max_travel_minutes       integer,
  service_preferences      jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. CONSENTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE consents (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_profile_id uuid NOT NULL
                           REFERENCES participant_profiles(id) ON DELETE CASCADE,
  consent_type           text NOT NULL
                           CHECK (consent_type IN (
                             'data_sharing',
                             'service_agreement',
                             'plan_management',
                             'transport',
                             'medical_info'
                           )),
  granted_by             uuid NOT NULL REFERENCES users(id),
  granted_at             timestamptz NOT NULL DEFAULT now(),
  expires_at             timestamptz,
  revoked_at             timestamptz,
  document_url           text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. WORKERS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE workers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES users(id),
  organisation_id   uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  full_name         text NOT NULL,
  worker_role       text NOT NULL DEFAULT 'support_worker'
                      CHECK (worker_role IN (
                        'support_worker', 'therapist', 'driver', 'coordinator'
                      )),
  qualifications    jsonb NOT NULL DEFAULT '[]'::jsonb,
  clearance_status  text NOT NULL DEFAULT 'pending'
                      CHECK (clearance_status IN (
                        'pending', 'cleared', 'expired', 'revoked'
                      )),
  clearance_expiry  date,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. VEHICLES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE vehicles (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id        uuid NOT NULL
                           REFERENCES organisations(id) ON DELETE CASCADE,
  registration           text NOT NULL,
  make                   text,
  model                  text,
  year                   integer,
  vehicle_type           text NOT NULL DEFAULT 'sedan'
                           CHECK (vehicle_type IN (
                             'sedan', 'suv', 'van',
                             'wheelchair_accessible', 'minibus'
                           )),
  wheelchair_accessible  boolean NOT NULL DEFAULT false,
  capacity               integer NOT NULL DEFAULT 4,
  active                 boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, registration)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. AVAILABILITY
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE availability_slots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id        uuid REFERENCES workers(id) ON DELETE CASCADE,
  vehicle_id       uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  starts_at        timestamptz NOT NULL,
  ends_at          timestamptz NOT NULL,
  recurrence_rule  text,            -- iCal RRULE for repeating slots
  is_available     boolean NOT NULL DEFAULT true,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT availability_slots_owner_check
    CHECK (worker_id IS NOT NULL OR vehicle_id IS NOT NULL),
  CONSTRAINT availability_slots_time_check
    CHECK (ends_at > starts_at)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. COORDINATION WORKFLOW
-- ═══════════════════════════════════════════════════════════════════════════

-- coordination_requests — the root of every coordination flow
CREATE TABLE coordination_requests (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_profile_id uuid NOT NULL
                           REFERENCES participant_profiles(id),
  requested_by           uuid NOT NULL REFERENCES users(id),
  request_type           text NOT NULL
                           CHECK (request_type IN ('care', 'transport', 'both')),
  service_type           text,       -- specific service (e.g. "personal_care", "community_access")
  urgency                text NOT NULL DEFAULT 'standard'
                           CHECK (urgency IN (
                             'low', 'standard', 'urgent', 'emergency'
                           )),
  status                 text NOT NULL DEFAULT 'open'
                           CHECK (status IN (
                             'open', 'matching', 'matched',
                             'booked', 'completed', 'cancelled'
                           )),
  preferred_start        timestamptz,
  preferred_end          timestamptz,
  location               geography(Point, 4326),
  destination            geography(Point, 4326),  -- for transport requests
  notes                  text,
  ai_summary             text,       -- LLM-generated summary of the request
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- recommendations — AI-ranked provider/worker suggestions
CREATE TABLE recommendations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordination_request_id  uuid NOT NULL
                             REFERENCES coordination_requests(id) ON DELETE CASCADE,
  organisation_id          uuid NOT NULL REFERENCES organisations(id),
  worker_id                uuid REFERENCES workers(id),
  vehicle_id               uuid REFERENCES vehicles(id),
  rank                     integer NOT NULL DEFAULT 1,
  score                    numeric(5,2),
  reasoning                text,      -- LLM explanation of why this was ranked here
  status                   text NOT NULL DEFAULT 'pending'
                             CHECK (status IN (
                               'pending', 'accepted', 'rejected', 'expired'
                             )),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- bookings — confirmed service appointments
CREATE TABLE bookings (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordination_request_id  uuid REFERENCES coordination_requests(id),
  recommendation_id        uuid REFERENCES recommendations(id),
  participant_profile_id   uuid NOT NULL REFERENCES participant_profiles(id),
  organisation_id          uuid NOT NULL REFERENCES organisations(id),
  worker_id                uuid REFERENCES workers(id),
  vehicle_id               uuid REFERENCES vehicles(id),
  starts_at                timestamptz NOT NULL,
  ends_at                  timestamptz NOT NULL,
  status                   text NOT NULL DEFAULT 'pending'
                             CHECK (status IN (
                               'pending', 'confirmed', 'in_progress',
                               'completed', 'cancelled', 'no_show'
                             )),
  cancellation_reason      text,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_time_check CHECK (ends_at > starts_at)
);

-- followups — post-booking check-ins, incidents, feedback
CREATE TABLE followups (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  created_by     uuid NOT NULL REFERENCES users(id),
  followup_type  text NOT NULL
                   CHECK (followup_type IN (
                     'check_in', 'incident_report', 'feedback',
                     'complaint', 'quality_review'
                   )),
  status         text NOT NULL DEFAULT 'open'
                   CHECK (status IN (
                     'open', 'in_progress', 'resolved', 'escalated'
                   )),
  priority       text NOT NULL DEFAULT 'normal'
                   CHECK (priority IN (
                     'low', 'normal', 'high', 'critical'
                   )),
  summary        text,
  details        text,
  resolved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- ── users ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_users_clerk_id    ON users (clerk_id);
CREATE INDEX idx_users_email       ON users (email);
CREATE INDEX idx_users_updated_at  ON users (updated_at);

-- ── roles ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_roles_user_id         ON roles (user_id);
CREATE INDEX idx_roles_organisation_id ON roles (organisation_id);
CREATE INDEX idx_roles_role            ON roles (role);

-- ── organisations ──────────────────────────────────────────────────────────
CREATE INDEX idx_organisations_org_type    ON organisations (org_type);
CREATE INDEX idx_organisations_active      ON organisations (active);
CREATE INDEX idx_organisations_location    ON organisations USING gist (location);
CREATE INDEX idx_organisations_updated_at  ON organisations (updated_at);

-- ── organisation_claims ────────────────────────────────────────────────────
CREATE INDEX idx_org_claims_organisation_id ON organisation_claims (organisation_id);
CREATE INDEX idx_org_claims_claimed_by      ON organisation_claims (claimed_by);
CREATE INDEX idx_org_claims_status          ON organisation_claims (status);

-- ── participant_profiles ───────────────────────────────────────────────────
CREATE INDEX idx_participant_profiles_user_id        ON participant_profiles (user_id);
CREATE INDEX idx_participant_profiles_ndis_number    ON participant_profiles (ndis_number);
CREATE INDEX idx_participant_profiles_risk_tier      ON participant_profiles (risk_tier);
CREATE INDEX idx_participant_profiles_risk_score     ON participant_profiles (risk_score);
CREATE INDEX idx_participant_profiles_active         ON participant_profiles (active);
CREATE INDEX idx_participant_profiles_home_location  ON participant_profiles USING gist (home_location);
CREATE INDEX idx_participant_profiles_plan_end_date  ON participant_profiles (plan_end_date);
CREATE INDEX idx_participant_profiles_updated_at     ON participant_profiles (updated_at);

-- ── participant_preferences ────────────────────────────────────────────────
CREATE INDEX idx_participant_prefs_profile_id ON participant_preferences (participant_profile_id);

-- ── consents ───────────────────────────────────────────────────────────────
CREATE INDEX idx_consents_profile_id   ON consents (participant_profile_id);
CREATE INDEX idx_consents_consent_type ON consents (consent_type);
CREATE INDEX idx_consents_granted_by   ON consents (granted_by);

-- ── workers ────────────────────────────────────────────────────────────────
CREATE INDEX idx_workers_user_id           ON workers (user_id);
CREATE INDEX idx_workers_organisation_id   ON workers (organisation_id);
CREATE INDEX idx_workers_worker_role       ON workers (worker_role);
CREATE INDEX idx_workers_clearance_status  ON workers (clearance_status);
CREATE INDEX idx_workers_active            ON workers (active);
CREATE INDEX idx_workers_updated_at        ON workers (updated_at);

-- ── vehicles ───────────────────────────────────────────────────────────────
CREATE INDEX idx_vehicles_organisation_id       ON vehicles (organisation_id);
CREATE INDEX idx_vehicles_vehicle_type          ON vehicles (vehicle_type);
CREATE INDEX idx_vehicles_wheelchair_accessible ON vehicles (wheelchair_accessible);
CREATE INDEX idx_vehicles_active                ON vehicles (active);
CREATE INDEX idx_vehicles_updated_at            ON vehicles (updated_at);

-- ── availability_slots ─────────────────────────────────────────────────────
CREATE INDEX idx_avail_worker_id   ON availability_slots (worker_id);
CREATE INDEX idx_avail_vehicle_id  ON availability_slots (vehicle_id);
CREATE INDEX idx_avail_starts_at   ON availability_slots (starts_at);
CREATE INDEX idx_avail_time_range  ON availability_slots (starts_at, ends_at);
CREATE INDEX idx_avail_available   ON availability_slots (is_available);

-- ── coordination_requests ──────────────────────────────────────────────────
CREATE INDEX idx_coord_req_participant_id  ON coordination_requests (participant_profile_id);
CREATE INDEX idx_coord_req_requested_by    ON coordination_requests (requested_by);
CREATE INDEX idx_coord_req_status          ON coordination_requests (status);
CREATE INDEX idx_coord_req_urgency         ON coordination_requests (urgency);
CREATE INDEX idx_coord_req_request_type    ON coordination_requests (request_type);
CREATE INDEX idx_coord_req_location        ON coordination_requests USING gist (location);
CREATE INDEX idx_coord_req_destination     ON coordination_requests USING gist (destination);
CREATE INDEX idx_coord_req_updated_at      ON coordination_requests (updated_at);

-- ── recommendations ────────────────────────────────────────────────────────
CREATE INDEX idx_recommendations_request_id     ON recommendations (coordination_request_id);
CREATE INDEX idx_recommendations_organisation_id ON recommendations (organisation_id);
CREATE INDEX idx_recommendations_worker_id      ON recommendations (worker_id);
CREATE INDEX idx_recommendations_status         ON recommendations (status);
CREATE INDEX idx_recommendations_rank           ON recommendations (coordination_request_id, rank);

-- ── bookings ───────────────────────────────────────────────────────────────
CREATE INDEX idx_bookings_participant_id   ON bookings (participant_profile_id);
CREATE INDEX idx_bookings_organisation_id  ON bookings (organisation_id);
CREATE INDEX idx_bookings_worker_id        ON bookings (worker_id);
CREATE INDEX idx_bookings_vehicle_id       ON bookings (vehicle_id);
CREATE INDEX idx_bookings_status           ON bookings (status);
CREATE INDEX idx_bookings_starts_at        ON bookings (starts_at);
CREATE INDEX idx_bookings_time_range       ON bookings (starts_at, ends_at);
CREATE INDEX idx_bookings_coord_request    ON bookings (coordination_request_id);
CREATE INDEX idx_bookings_updated_at       ON bookings (updated_at);

-- ── followups ──────────────────────────────────────────────────────────────
CREATE INDEX idx_followups_booking_id   ON followups (booking_id);
CREATE INDEX idx_followups_created_by   ON followups (created_by);
CREATE INDEX idx_followups_status       ON followups (status);
CREATE INDEX idx_followups_priority     ON followups (priority);
CREATE INDEX idx_followups_type         ON followups (followup_type);
CREATE INDEX idx_followups_updated_at   ON followups (updated_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- updated_at trigger — auto-set updated_at on every UPDATE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'users', 'roles', 'organisations', 'organisation_claims',
      'participant_profiles', 'participant_preferences', 'consents',
      'workers', 'vehicles', 'availability_slots',
      'coordination_requests', 'recommendations', 'bookings', 'followups'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;

COMMIT;
