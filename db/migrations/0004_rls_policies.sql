-- 0004_rls_policies.sql — Row-Level Security for data isolation.
--
-- Defence-in-depth layer: even if app-layer auth checks have bugs,
-- Postgres itself blocks unauthorised reads/writes.
--
-- Session variables set by the app at the start of each request:
--   app.current_user_id  — internal users.id (uuid)
--   app.current_role      — highest-priority role for this request
--   app.current_org_id    — organisation_id (null for non-org-scoped requests)
--
-- The app calls set_rls_context() inside a transaction before any query.
-- Superuser / migration connections bypass RLS automatically.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- Helper function: set session variables for RLS policies
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_rls_context(
  p_user_id  uuid,
  p_role     text,
  p_org_id   uuid DEFAULT NULL
) RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::text, true);
  PERFORM set_config('app.current_role', p_role, true);
  IF p_org_id IS NOT NULL THEN
    PERFORM set_config('app.current_org_id', p_org_id::text, true);
  ELSE
    PERFORM set_config('app.current_org_id', '', true);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Helper to read the current user_id safely (returns NULL if not set)
CREATE OR REPLACE FUNCTION rls_user_id() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper to read the current role safely
CREATE OR REPLACE FUNCTION rls_role() RETURNS text AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_role', true), '');
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper to read the current org_id safely
CREATE OR REPLACE FUNCTION rls_org_id() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_org_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Broad-access roles that can see all data
CREATE OR REPLACE FUNCTION rls_is_broad_role() RETURNS boolean AS $$
BEGIN
  RETURN rls_role() IN ('admin', 'coordinator', 'auditor');
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════
-- Enable RLS on all tables
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordination_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. USERS — users see their own row; broad roles see all
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY users_self ON users
  FOR ALL USING (id = rls_user_id());

CREATE POLICY users_broad ON users
  FOR SELECT USING (rls_is_broad_role());

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ROLES — users see their own roles; broad roles see all
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY roles_self ON roles
  FOR ALL USING (user_id = rls_user_id());

CREATE POLICY roles_broad ON roles
  FOR SELECT USING (rls_is_broad_role());

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ORGANISATIONS — public read; provider_admin write their own org
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY orgs_read_all ON organisations
  FOR SELECT USING (true);

CREATE POLICY orgs_write_own ON organisations
  FOR ALL USING (
    rls_is_broad_role()
    OR (rls_role() = 'provider_admin' AND id = rls_org_id())
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ORGANISATION CLAIMS — provider_admin for their org; broad roles all
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY org_claims_own ON organisation_claims
  FOR ALL USING (
    claimed_by = rls_user_id()
    OR (rls_role() = 'provider_admin' AND organisation_id = rls_org_id())
    OR rls_is_broad_role()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. PARTICIPANT PROFILES — participant sees own; broad roles see all
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY profiles_self ON participant_profiles
  FOR ALL USING (user_id = rls_user_id());

CREATE POLICY profiles_broad ON participant_profiles
  FOR SELECT USING (rls_is_broad_role());

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. PARTICIPANT PREFERENCES — same as profiles
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY prefs_self ON participant_preferences
  FOR ALL USING (
    participant_profile_id IN (
      SELECT id FROM participant_profiles WHERE user_id = rls_user_id()
    )
  );

CREATE POLICY prefs_broad ON participant_preferences
  FOR SELECT USING (rls_is_broad_role());

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. CONSENTS — participant sees own; broad roles see all
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY consents_self ON consents
  FOR ALL USING (
    granted_by = rls_user_id()
    OR participant_profile_id IN (
      SELECT id FROM participant_profiles WHERE user_id = rls_user_id()
    )
  );

CREATE POLICY consents_broad ON consents
  FOR SELECT USING (rls_is_broad_role());

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. WORKERS — worker sees own row; provider_admin sees org workers
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY workers_self ON workers
  FOR ALL USING (user_id = rls_user_id());

CREATE POLICY workers_org ON workers
  FOR ALL USING (
    rls_role() = 'provider_admin' AND organisation_id = rls_org_id()
  );

CREATE POLICY workers_broad ON workers
  FOR SELECT USING (rls_is_broad_role());

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. VEHICLES — provider_admin sees org vehicles; broad roles see all
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY vehicles_org ON vehicles
  FOR ALL USING (
    rls_role() = 'provider_admin' AND organisation_id = rls_org_id()
  );

CREATE POLICY vehicles_broad ON vehicles
  FOR SELECT USING (rls_is_broad_role());

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. AVAILABILITY SLOTS — worker sees own; provider_admin sees org
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY avail_worker ON availability_slots
  FOR ALL USING (
    worker_id IN (SELECT id FROM workers WHERE user_id = rls_user_id())
  );

CREATE POLICY avail_org ON availability_slots
  FOR ALL USING (
    rls_role() = 'provider_admin'
    AND (
      worker_id IN (SELECT id FROM workers WHERE organisation_id = rls_org_id())
      OR vehicle_id IN (SELECT id FROM vehicles WHERE organisation_id = rls_org_id())
    )
  );

CREATE POLICY avail_broad ON availability_slots
  FOR SELECT USING (rls_is_broad_role());

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. COORDINATION REQUESTS — participant sees own; broad roles see all
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY coord_req_self ON coordination_requests
  FOR ALL USING (
    requested_by = rls_user_id()
    OR participant_profile_id IN (
      SELECT id FROM participant_profiles WHERE user_id = rls_user_id()
    )
  );

CREATE POLICY coord_req_broad ON coordination_requests
  FOR SELECT USING (rls_is_broad_role());

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. RECOMMENDATIONS — provider_admin sees own org; broad roles see all
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY recs_org ON recommendations
  FOR SELECT USING (
    rls_role() = 'provider_admin' AND organisation_id = rls_org_id()
  );

CREATE POLICY recs_broad ON recommendations
  FOR ALL USING (rls_is_broad_role());

-- ═══════════════════════════════════════════════════════════════════════════
-- 13. BOOKINGS — participant sees own; worker sees assigned; org sees own
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY bookings_participant ON bookings
  FOR SELECT USING (
    participant_profile_id IN (
      SELECT id FROM participant_profiles WHERE user_id = rls_user_id()
    )
  );

CREATE POLICY bookings_worker ON bookings
  FOR SELECT USING (
    worker_id IN (SELECT id FROM workers WHERE user_id = rls_user_id())
  );

CREATE POLICY bookings_org ON bookings
  FOR ALL USING (
    rls_role() = 'provider_admin' AND organisation_id = rls_org_id()
  );

CREATE POLICY bookings_broad ON bookings
  FOR ALL USING (rls_is_broad_role());

-- ═══════════════════════════════════════════════════════════════════════════
-- 14. FOLLOWUPS — created_by sees own; broad roles see all
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY followups_self ON followups
  FOR ALL USING (created_by = rls_user_id());

CREATE POLICY followups_booking ON followups
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings WHERE
        participant_profile_id IN (
          SELECT id FROM participant_profiles WHERE user_id = rls_user_id()
        )
        OR worker_id IN (SELECT id FROM workers WHERE user_id = rls_user_id())
    )
  );

CREATE POLICY followups_broad ON followups
  FOR ALL USING (rls_is_broad_role());

-- ═══════════════════════════════════════════════════════════════════════════
-- 15. EVIDENCE REFS — provider_admin for their entity; broad roles all
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY evidence_org ON evidence_refs
  FOR ALL USING (
    rls_role() = 'provider_admin'
    AND entity_type = 'organisation' AND entity_id = rls_org_id()
  );

CREATE POLICY evidence_org_worker ON evidence_refs
  FOR ALL USING (
    rls_role() = 'provider_admin'
    AND entity_type = 'worker'
    AND entity_id IN (SELECT id FROM workers WHERE organisation_id = rls_org_id())
  );

CREATE POLICY evidence_broad ON evidence_refs
  FOR ALL USING (rls_is_broad_role());

-- ═══════════════════════════════════════════════════════════════════════════
-- 16. AUDIT LOG — admin and auditor only (immutable, append-only)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE POLICY audit_log_read ON audit_log
  FOR SELECT USING (
    rls_role() IN ('admin', 'auditor')
  );

CREATE POLICY audit_log_insert ON audit_log
  FOR INSERT WITH CHECK (true);

COMMIT;
