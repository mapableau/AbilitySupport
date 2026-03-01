/**
 * lib/auth/sso-link.ts — SSO identity link management.
 *
 * Creates and queries sso_links rows that map external IdP identities
 * (Disapedia OIDC sub, AccessiBooks SAML NameID) to internal MapAble users.
 */

export interface SsoLinkRecord {
  id: string;
  userId: string;
  provider: "disapedia" | "accessibooks";
  externalId: string;
  email: string | null;
  displayName: string | null;
  organisationId: string | null;
  providerRole: string | null;
  metadata: Record<string, unknown>;
  linkedAt: string;
  lastLoginAt: string | null;
  active: boolean;
}

export interface CreateSsoLinkInput {
  userId: string;
  provider: "disapedia" | "accessibooks";
  externalId: string;
  email?: string;
  displayName?: string;
  organisationId?: string;
  providerRole?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Find an existing SSO link by provider + external ID.
 * Returns null if no link exists (first-time login).
 *
 * TODO: SELECT * FROM sso_links WHERE provider = $1 AND external_id = $2 AND active = true
 */
export async function findSsoLink(
  provider: string,
  externalId: string,
): Promise<SsoLinkRecord | null> {
  console.log(`[sso-link] findSsoLink(${provider}, ${externalId}) — stub`);
  return null;
}

/**
 * Find all SSO links for a user.
 *
 * TODO: SELECT * FROM sso_links WHERE user_id = $1 AND active = true
 */
export async function findSsoLinksForUser(
  userId: string,
): Promise<SsoLinkRecord[]> {
  console.log(`[sso-link] findSsoLinksForUser(${userId}) — stub`);
  return [];
}

/**
 * Create a new SSO link. Idempotent — if the link already exists,
 * updates last_login_at and returns the existing record.
 *
 * TODO: INSERT INTO sso_links (...) VALUES (...) ON CONFLICT (provider, external_id)
 *   DO UPDATE SET last_login_at = now(), updated_at = now() RETURNING *
 */
export async function createSsoLink(
  input: CreateSsoLinkInput,
): Promise<SsoLinkRecord> {
  console.log(`[sso-link] createSsoLink(${input.provider}, ${input.externalId}) — stub`);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    provider: input.provider,
    externalId: input.externalId,
    email: input.email ?? null,
    displayName: input.displayName ?? null,
    organisationId: input.organisationId ?? null,
    providerRole: input.providerRole ?? null,
    metadata: input.metadata ?? {},
    linkedAt: now,
    lastLoginAt: now,
    active: true,
  };
}

/**
 * Update last_login_at on an existing link (called on every SSO login).
 *
 * TODO: UPDATE sso_links SET last_login_at = now(), updated_at = now() WHERE id = $1
 */
export async function touchSsoLink(linkId: string): Promise<void> {
  console.log(`[sso-link] touchSsoLink(${linkId}) — stub`);
}

/**
 * Deactivate an SSO link (unlink an external identity).
 *
 * TODO: UPDATE sso_links SET active = false, updated_at = now() WHERE id = $1
 */
export async function deactivateSsoLink(linkId: string): Promise<void> {
  console.log(`[sso-link] deactivateSsoLink(${linkId}) — stub`);
}
