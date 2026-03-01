/**
 * lib/auth/federation.ts — Federation helpers for SSO-sourced users.
 *
 * Pure functions for mapping IdP claims to MapAble roles and detecting
 * the federation source from Clerk webhook payloads.
 */

import type { UserRole } from "../schemas/enums.js";
import { DEFAULT_ROLE } from "./rbac.js";

/** A resolved identity from a federated login. */
export interface FederatedIdentity {
  clerkId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  federationSource: "disapedia" | "accessibooks" | "direct";
  externalId: string | null;
  disapediaId: string | null;
  groups: string[];
}

/** Group → role mapping for auto-assignment. */
export interface GroupRoleMapping {
  [groupName: string]: UserRole;
}

/**
 * Detect the federation source from a Clerk webhook payload.
 * Clerk stores the SSO connection ID in the user's external accounts.
 */
export function detectFederationSource(
  clerkPayload: {
    external_accounts?: Array<{ provider?: string; label?: string }>;
    public_metadata?: Record<string, unknown>;
  },
  disapediaConnectionId?: string,
  accessibooksConnectionId?: string,
): "disapedia" | "accessibooks" | "direct" {
  const externalAccounts = clerkPayload.external_accounts ?? [];

  for (const acc of externalAccounts) {
    if (disapediaConnectionId && acc.provider === disapediaConnectionId) {
      return "disapedia";
    }
    if (accessibooksConnectionId && acc.provider === accessibooksConnectionId) {
      return "accessibooks";
    }
  }

  const meta = clerkPayload.public_metadata ?? {};
  if (meta.disapediaId) return "disapedia";
  if (meta.accessibooksOrgId) return "accessibooks";

  return "direct";
}

/**
 * Determine the initial role for a federated user based on their IdP groups.
 * Falls back to DEFAULT_ROLE ("participant") if no group matches.
 */
export function roleFromGroups(
  groups: string[],
  mapping: GroupRoleMapping,
): UserRole {
  for (const group of groups) {
    const mapped = mapping[group];
    if (mapped) return mapped;
  }
  return DEFAULT_ROLE;
}

/**
 * Extract a FederatedIdentity from a Clerk webhook payload.
 */
export function extractFederatedIdentity(
  payload: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
    external_accounts?: Array<{ provider?: string }>;
    public_metadata?: Record<string, unknown>;
  },
  disapediaConnectionId?: string,
  accessibooksConnectionId?: string,
): FederatedIdentity {
  const source = detectFederationSource(
    payload,
    disapediaConnectionId,
    accessibooksConnectionId,
  );

  const meta = payload.public_metadata ?? {};

  return {
    clerkId: payload.id,
    email: payload.email_addresses?.[0]?.email_address ?? "",
    fullName: [payload.first_name, payload.last_name].filter(Boolean).join(" ") || "Unknown",
    avatarUrl: payload.image_url ?? null,
    federationSource: source,
    externalId: typeof meta.externalId === "string" ? meta.externalId : null,
    disapediaId: typeof meta.disapediaId === "string" ? meta.disapediaId : null,
    groups: Array.isArray(meta.disapediaGroups) ? meta.disapediaGroups as string[] : [],
  };
}
