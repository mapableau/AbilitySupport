-- 0005_sso_links.sql — SSO identity links for federated logins.
--
-- Stores the mapping between external IdP identities and internal
-- MapAble users. Supports multiple providers (Disapedia, AccessiBooks, etc.)
-- and multiple links per user (a user can have both a Disapedia and
-- an AccessiBooks identity).
--
-- Used to:
--   - Look up whether an SSO user already has a MapAble account
--   - Store provider-specific metadata (org_id, external groups)
--   - Track when the link was created and last used

BEGIN;

CREATE TABLE sso_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Which IdP this link is for
  provider        text NOT NULL
                    CHECK (provider IN ('disapedia', 'accessibooks')),

  -- The stable external identifier from the IdP (OIDC sub or SAML NameID)
  external_id     text NOT NULL,

  -- Provider-specific metadata
  email           text,
  display_name    text,
  organisation_id uuid,                 -- AccessiBooks org linking
  provider_role   text,                 -- role hint from the IdP (e.g. SAML role attribute)
  metadata        jsonb DEFAULT '{}'::jsonb,

  -- Lifecycle
  linked_at       timestamptz NOT NULL DEFAULT now(),
  last_login_at   timestamptz,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (provider, external_id)
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX idx_sso_links_user_id        ON sso_links (user_id);
CREATE INDEX idx_sso_links_provider       ON sso_links (provider);
CREATE INDEX idx_sso_links_external_id    ON sso_links (provider, external_id);
CREATE INDEX idx_sso_links_organisation   ON sso_links (organisation_id);
CREATE INDEX idx_sso_links_active         ON sso_links (active);
CREATE INDEX idx_sso_links_updated_at     ON sso_links (updated_at);

-- ── updated_at trigger ─────────────────────────────────────────────────────

CREATE TRIGGER trg_sso_links_updated_at
  BEFORE UPDATE ON sso_links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE sso_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY sso_links_self ON sso_links
  FOR ALL USING (user_id = rls_user_id());

CREATE POLICY sso_links_broad ON sso_links
  FOR SELECT USING (rls_is_broad_role());

COMMIT;
