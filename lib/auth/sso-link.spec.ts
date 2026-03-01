import { createSsoLink, findSsoLink, findSsoLinksForUser } from "./sso-link";
import {
  extractFederatedIdentity,
  roleFromAccessiBooks,
} from "./federation";
import * as fs from "fs";
import * as path from "path";

// ── SSO link data access ───────────────────────────────────────────────────

describe("sso-link", () => {
  it("creates a Disapedia link with correct fields", async () => {
    const link = await createSsoLink({
      userId: "user-1",
      provider: "disapedia",
      externalId: "test-disapedia-001",
      email: "alice@disapedia.org",
      displayName: "Alice Test",
    });
    expect(link.provider).toBe("disapedia");
    expect(link.externalId).toBe("test-disapedia-001");
    expect(link.userId).toBe("user-1");
    expect(link.organisationId).toBeNull();
    expect(link.active).toBe(true);
  });

  it("creates an AccessiBooks link with org and role", async () => {
    const link = await createSsoLink({
      userId: "user-2",
      provider: "accessibooks",
      externalId: "sarah@acme.com.au",
      email: "sarah@acme.com.au",
      displayName: "Sarah Coordinator",
      organisationId: "org-acme-001",
      providerRole: "coordinator",
    });
    expect(link.provider).toBe("accessibooks");
    expect(link.organisationId).toBe("org-acme-001");
    expect(link.providerRole).toBe("coordinator");
  });

  it("findSsoLink returns null from stub", async () => {
    const link = await findSsoLink("disapedia", "nonexistent");
    expect(link).toBeNull();
  });

  it("findSsoLinksForUser returns empty from stub", async () => {
    const links = await findSsoLinksForUser("user-1");
    expect(links).toEqual([]);
  });
});

// ── AccessiBooks role mapping ──────────────────────────────────────────────

describe("roleFromAccessiBooks", () => {
  it("maps 'coordinator' to coordinator", () => {
    expect(roleFromAccessiBooks("coordinator")).toBe("coordinator");
  });

  it("maps 'plan_manager' to coordinator", () => {
    expect(roleFromAccessiBooks("plan_manager")).toBe("coordinator");
  });

  it("maps 'Coordinator' (case-insensitive) to coordinator", () => {
    expect(roleFromAccessiBooks("Coordinator")).toBe("coordinator");
  });

  it("maps 'auditor' to auditor", () => {
    expect(roleFromAccessiBooks("auditor")).toBe("auditor");
  });

  it("maps null to provider_admin (default)", () => {
    expect(roleFromAccessiBooks(null)).toBe("provider_admin");
  });

  it("maps unknown role to provider_admin", () => {
    expect(roleFromAccessiBooks("accountant")).toBe("provider_admin");
  });
});

// ── AccessiBooks identity extraction ───────────────────────────────────────

describe("extractFederatedIdentity (AccessiBooks)", () => {
  it("detects accessibooks source and extracts org_id + role", () => {
    const payload = {
      id: "clerk_ab_user",
      email_addresses: [{ email_address: "sarah@acme.com.au" }],
      first_name: "Sarah",
      last_name: "Coordinator",
      external_accounts: [{ provider: "conn_ab_test" }],
      public_metadata: {
        accessibooksOrgId: "org-acme-001",
        accessibooksRole: "coordinator",
      },
    };

    const identity = extractFederatedIdentity(payload, undefined, "conn_ab_test");

    expect(identity.federationSource).toBe("accessibooks");
    expect(identity.accessibooksOrgId).toBe("org-acme-001");
    expect(identity.accessibooksRole).toBe("coordinator");
    expect(identity.email).toBe("sarah@acme.com.au");
    expect(identity.fullName).toBe("Sarah Coordinator");
  });

  it("detects accessibooks from public_metadata when connection ID not matched", () => {
    const payload = {
      id: "clerk_ab_meta",
      email_addresses: [{ email_address: "mike@bp.com.au" }],
      first_name: "Mike",
      last_name: "Plans",
      public_metadata: {
        accessibooksOrgId: "org-bp-002",
        accessibooksRole: "plan_manager",
      },
    };

    const identity = extractFederatedIdentity(payload);
    expect(identity.federationSource).toBe("accessibooks");
    expect(identity.accessibooksOrgId).toBe("org-bp-002");
    expect(identity.accessibooksRole).toBe("plan_manager");
  });

  it("returns null accessibooks fields for direct login", () => {
    const payload = {
      id: "clerk_direct",
      email_addresses: [{ email_address: "user@example.com" }],
      first_name: "Direct",
      last_name: "User",
    };

    const identity = extractFederatedIdentity(payload);
    expect(identity.federationSource).toBe("direct");
    expect(identity.accessibooksOrgId).toBeNull();
    expect(identity.accessibooksRole).toBeNull();
  });
});

// ── Config file validation ─────────────────────────────────────────────────

describe("AccessiBooks config files", () => {
  const configDir = path.join(__dirname, "../../config/federation");

  it("accessibooks-saml.json has valid structure", () => {
    const raw = fs.readFileSync(path.join(configDir, "accessibooks-saml.json"), "utf-8");
    const config = JSON.parse(raw);

    expect(config.provider.name).toBe("AccessiBooks");
    expect(config.provider.protocol).toBe("saml");
    expect(config.provider.entity_id).toBeTruthy();
    expect(config.provider.sso_url).toBeTruthy();
    expect(config.service_provider.acs_url).toBeTruthy();
    expect(config.attribute_mapping.NameID).toBeTruthy();
    expect(config.attribute_mapping.org_id).toBe("publicMetadata.accessibooksOrgId");
    expect(config.attribute_mapping.role).toBe("publicMetadata.accessibooksRole");
    expect(config.provisioning.auto_link_organisation).toBe(true);
    expect(config.provisioning.role_mapping.coordinator).toBe("coordinator");
    expect(config.provisioning.role_mapping._default).toBe("provider_admin");
  });

  it("accessibooks-saml.test.json has test users with expected roles", () => {
    const raw = fs.readFileSync(path.join(configDir, "accessibooks-saml.test.json"), "utf-8");
    const config = JSON.parse(raw);

    expect(config.test_users).toHaveLength(3);
    expect(config.test_users[0].expected_mapable_role).toBe("coordinator");
    expect(config.test_users[0].expected_org_link).toBe(true);
    expect(config.test_users[1].role).toBe("plan_manager");
    expect(config.test_users[1].expected_mapable_role).toBe("coordinator");
    expect(config.test_users[2].role).toBeNull();
    expect(config.test_users[2].expected_mapable_role).toBe("provider_admin");
  });
});
