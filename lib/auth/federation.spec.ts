import * as fs from "fs";
import * as path from "path";
import {
  detectFederationSource,
  roleFromGroups,
  extractFederatedIdentity,
} from "./federation";

// ── Load and validate config files ─────────────────────────────────────────

const configDir = path.join(__dirname, "../../config/federation");

describe("federation config files", () => {
  it("disapedia-oidc.json is valid JSON with required fields", () => {
    const raw = fs.readFileSync(path.join(configDir, "disapedia-oidc.json"), "utf-8");
    const config = JSON.parse(raw);

    expect(config.provider.name).toBe("Disapedia");
    expect(config.provider.protocol).toBe("oidc");
    expect(config.provider.discovery_url).toContain(".well-known/openid-configuration");
    expect(config.provider.issuer).toBeTruthy();
    expect(config.provider.authorization_endpoint).toBeTruthy();
    expect(config.provider.token_endpoint).toBeTruthy();
    expect(config.provider.userinfo_endpoint).toBeTruthy();
    expect(config.provider.jwks_uri).toBeTruthy();

    expect(config.client.response_type).toBe("code");
    expect(config.client.code_challenge_method).toBe("S256");
    expect(config.client.scopes).toContain("openid");
    expect(config.client.scopes).toContain("email");
    expect(config.client.scopes).toContain("profile");

    expect(config.claims_mapping.sub).toBe("externalId");
    expect(config.claims_mapping.email).toBeTruthy();

    expect(config.provisioning.default_role).toBe("participant");
    expect(config.security.pkce_required).toBe(true);
    expect(config.security.signature_algorithm).toBe("RS256");
  });

  it("disapedia-oidc.test.json has test users with expected roles", () => {
    const raw = fs.readFileSync(path.join(configDir, "disapedia-oidc.test.json"), "utf-8");
    const config = JSON.parse(raw);

    expect(config.provider.name).toBe("Disapedia (Test)");
    expect(config.provider.issuer).toContain("localhost");

    expect(config.test_users).toHaveLength(2);
    expect(config.test_users[0].expected_mapable_role).toBe("participant");
    expect(config.test_users[1].expected_mapable_role).toBe("auditor");
    expect(config.test_users[1].groups).toContain("accessibility_reviewers");
  });
});

// ── detectFederationSource ─────────────────────────────────────────────────

describe("detectFederationSource", () => {
  it("detects disapedia from external_accounts provider", () => {
    const result = detectFederationSource(
      { external_accounts: [{ provider: "conn_disapedia_123" }] },
      "conn_disapedia_123",
    );
    expect(result).toBe("disapedia");
  });

  it("detects accessibooks from external_accounts provider", () => {
    const result = detectFederationSource(
      { external_accounts: [{ provider: "conn_ab_456" }] },
      undefined,
      "conn_ab_456",
    );
    expect(result).toBe("accessibooks");
  });

  it("detects disapedia from public_metadata.disapediaId", () => {
    const result = detectFederationSource(
      { public_metadata: { disapediaId: "user:123" } },
    );
    expect(result).toBe("disapedia");
  });

  it("detects accessibooks from public_metadata.accessibooksOrgId", () => {
    const result = detectFederationSource(
      { public_metadata: { accessibooksOrgId: "org:456" } },
    );
    expect(result).toBe("accessibooks");
  });

  it("returns direct when no federation signals found", () => {
    const result = detectFederationSource({});
    expect(result).toBe("direct");
  });

  it("returns direct for empty external_accounts and metadata", () => {
    const result = detectFederationSource({
      external_accounts: [],
      public_metadata: {},
    });
    expect(result).toBe("direct");
  });
});

// ── roleFromGroups ─────────────────────────────────────────────────────────

describe("roleFromGroups", () => {
  const mapping = { accessibility_reviewers: "auditor" as const };

  it("maps matching group to role", () => {
    expect(roleFromGroups(["editors", "accessibility_reviewers"], mapping)).toBe("auditor");
  });

  it("returns default role when no groups match", () => {
    expect(roleFromGroups(["editors"], mapping)).toBe("participant");
  });

  it("returns default role for empty groups", () => {
    expect(roleFromGroups([], mapping)).toBe("participant");
  });

  it("uses first matching group", () => {
    const multiMapping = {
      editors: "worker" as const,
      accessibility_reviewers: "auditor" as const,
    };
    expect(roleFromGroups(["editors", "accessibility_reviewers"], multiMapping)).toBe("worker");
  });
});

// ── extractFederatedIdentity ───────────────────────────────────────────────

describe("extractFederatedIdentity", () => {
  const payload = {
    id: "clerk_abc",
    email_addresses: [{ email_address: "alice@disapedia.org" }],
    first_name: "Alice",
    last_name: "Johnson",
    image_url: "https://disapedia.org/avatar/123.jpg",
    external_accounts: [{ provider: "conn_dis" }],
    public_metadata: {
      disapediaId: "user:123",
      disapediaGroups: ["editors", "accessibility_reviewers"],
    },
  };

  it("extracts all fields from a Disapedia-sourced payload", () => {
    const id = extractFederatedIdentity(payload, "conn_dis");

    expect(id.clerkId).toBe("clerk_abc");
    expect(id.email).toBe("alice@disapedia.org");
    expect(id.fullName).toBe("Alice Johnson");
    expect(id.avatarUrl).toBe("https://disapedia.org/avatar/123.jpg");
    expect(id.federationSource).toBe("disapedia");
    expect(id.disapediaId).toBe("user:123");
    expect(id.groups).toEqual(["editors", "accessibility_reviewers"]);
  });

  it("returns direct source when connection IDs don't match", () => {
    const id = extractFederatedIdentity(
      { ...payload, external_accounts: [], public_metadata: {} },
    );
    expect(id.federationSource).toBe("direct");
    expect(id.disapediaId).toBeNull();
    expect(id.groups).toEqual([]);
  });

  it("handles missing optional fields", () => {
    const id = extractFederatedIdentity({
      id: "clerk_xyz",
      email_addresses: [],
      public_metadata: {},
    });
    expect(id.email).toBe("");
    expect(id.fullName).toBe("Unknown");
    expect(id.avatarUrl).toBeNull();
    expect(id.groups).toEqual([]);
  });
});
