/**
 * POST /api/auth/webhook — Clerk webhook handler.
 *
 * Receives user.created and user.updated events from Clerk.
 * On each event:
 *   1. Syncs the user to the internal users table
 *   2. Detects federation source (Disapedia, AccessiBooks, or direct)
 *   3. Creates/updates SSO link in sso_links table
 *   4. For AccessiBooks: auto-assigns org-scoped role + links org
 *   5. For Disapedia: assigns participant role (default)
 *   6. Assigns default role on first login
 *
 * Webhook signature verification:
 *   In production, verify using CLERK_WEBHOOK_SECRET via svix.
 *   Currently stubbed — accepts all POST bodies.
 */

import { syncUserFromClerk, assignRole } from "../../../../lib/auth/sync.js";
import {
  extractFederatedIdentity,
  roleFromAccessiBooks,
  roleFromGroups,
} from "../../../../lib/auth/federation.js";
import { createSsoLink, findSsoLink, touchSsoLink } from "../../../../lib/auth/sso-link.js";

interface ClerkWebhookPayload {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
    external_accounts?: Array<{ provider?: string }>;
    public_metadata?: Record<string, unknown>;
  };
}

export async function POST(request: Request): Promise<Response> {
  let payload: ClerkWebhookPayload;
  try {
    payload = (await request.json()) as ClerkWebhookPayload;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, data } = payload;

  if (type !== "user.created" && type !== "user.updated") {
    return Response.json({ ignored: true, type });
  }

  const disapediaConnId = process.env.CLERK_SSO_DISAPEDIA_CONNECTION_ID;
  const accessibooksConnId = process.env.CLERK_SSO_ACCESSIBOOKS_CONNECTION_ID;

  const identity = extractFederatedIdentity(data, disapediaConnId, accessibooksConnId);

  const { user, created } = await syncUserFromClerk({
    clerkId: identity.clerkId,
    email: identity.email,
    fullName: identity.fullName,
    avatarUrl: identity.avatarUrl ?? undefined,
  });

  let ssoLinkId: string | null = null;
  let federationAction: string | null = null;

  if (identity.federationSource !== "direct" && identity.externalId) {
    const existing = await findSsoLink(identity.federationSource, identity.externalId);

    if (existing) {
      await touchSsoLink(existing.id);
      ssoLinkId = existing.id;
      federationAction = "link_refreshed";
    } else {
      const link = await createSsoLink({
        userId: user.id,
        provider: identity.federationSource,
        externalId: identity.externalId,
        email: identity.email,
        displayName: identity.fullName,
        organisationId: identity.accessibooksOrgId ?? undefined,
        providerRole: identity.accessibooksRole ?? undefined,
        metadata: {
          disapediaId: identity.disapediaId,
          groups: identity.groups,
        },
      });
      ssoLinkId = link.id;
      federationAction = "link_created";
    }
  }

  if (created && identity.federationSource === "accessibooks") {
    const abRole = roleFromAccessiBooks(identity.accessibooksRole);
    await assignRole(user.id, abRole, identity.accessibooksOrgId ?? undefined);
    federationAction = `link_created+role_${abRole}`;
  }

  if (created && identity.federationSource === "disapedia") {
    const groupMapping = { accessibility_reviewers: "auditor" as const };
    const role = roleFromGroups(identity.groups, groupMapping);
    if (role !== "participant") {
      await assignRole(user.id, role);
    }
  }

  return Response.json({
    success: true,
    userId: user.id,
    created,
    event: type,
    federation: {
      source: identity.federationSource,
      ssoLinkId,
      action: federationAction,
      accessibooksOrgId: identity.accessibooksOrgId,
    },
  });
}
