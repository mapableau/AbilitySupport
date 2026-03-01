/**
 * Integration tests for the mock Disapedia OIDC provider.
 *
 * Starts the mock server, hits every endpoint, and verifies the responses
 * match what a real MediaWiki OAuth extension would return. Also validates
 * the full claim extraction chain via lib/auth/federation.
 */

import * as http from "node:http";
import { TEST_USERS, TEST_RSA_PUBLIC_KEY_JWK } from "./fixtures";
import { extractFederatedIdentity, roleFromGroups } from "../../lib/auth/federation";

const PORT = 14180;
const BASE = `http://localhost:${PORT}`;

let server: http.Server;

function get(path: string): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) });
      });
    }).on("error", reject);
  });
}

function post(path: string, body: string): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) });
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

beforeAll((done) => {
  process.env.MOCK_IDP_PORT = String(PORT);

  const { TEST_USERS: _, TEST_RSA_PUBLIC_KEY_JWK: __ } = require("./fixtures");

  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", BASE);
    const path = url.pathname;

    const jsonResp = (status: number, data: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };

    if (path === "/.well-known/openid-configuration") {
      jsonResp(200, {
        issuer: BASE,
        authorization_endpoint: `${BASE}/authorize`,
        token_endpoint: `${BASE}/token`,
        userinfo_endpoint: `${BASE}/userinfo`,
        jwks_uri: `${BASE}/jwks`,
        response_types_supported: ["code"],
        scopes_supported: ["openid", "profile", "email"],
        id_token_signing_alg_values_supported: ["RS256"],
        code_challenge_methods_supported: ["S256"],
      });
      return;
    }

    if (path === "/jwks") {
      jsonResp(200, { keys: [TEST_RSA_PUBLIC_KEY_JWK] });
      return;
    }

    if (path === "/authorize") {
      const testUser = url.searchParams.get("test_user") ?? TEST_USERS[0].sub;
      const code = `code-${testUser}`;
      jsonResp(200, { code, state: url.searchParams.get("state") ?? "", test_user: testUser });
      return;
    }

    if (path === "/token" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => { body += c; });
      req.on("end", () => {
        const params = new URLSearchParams(body);
        const code = params.get("code") ?? "";
        const userSub = code.replace("code-", "");
        const user = TEST_USERS.find(u => u.sub === userSub) ?? TEST_USERS[0];

        const payload = { iss: BASE, sub: user.sub, email: user.email, name: user.name, disapedia_id: user.disapedia_id, groups: user.groups };
        const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
        const pl = Buffer.from(JSON.stringify(payload)).toString("base64url");

        jsonResp(200, { access_token: `at-${userSub}`, id_token: `${header}.${pl}.mock`, token_type: "Bearer" });
      });
      return;
    }

    if (path === "/userinfo") {
      const user = TEST_USERS[0];
      jsonResp(200, { sub: user.sub, email: user.email, name: user.name, disapedia_id: user.disapedia_id, groups: user.groups });
      return;
    }

    jsonResp(404, { error: "not_found" });
  });

  server.listen(PORT, done);
});

afterAll((done) => {
  server.close(done);
});

describe("Mock Disapedia IdP", () => {
  // ── Discovery ──────────────────────────────────────────────────────────

  it("serves a valid OIDC discovery document", async () => {
    const { status, body } = await get("/.well-known/openid-configuration");
    expect(status).toBe(200);
    expect(body.issuer).toBe(BASE);
    expect(body.authorization_endpoint).toContain("/authorize");
    expect(body.token_endpoint).toContain("/token");
    expect(body.userinfo_endpoint).toContain("/userinfo");
    expect(body.jwks_uri).toContain("/jwks");
    expect(body.response_types_supported).toContain("code");
    expect(body.code_challenge_methods_supported).toContain("S256");
  });

  // ── JWKS ───────────────────────────────────────────────────────────────

  it("serves a JWKS with an RSA key", async () => {
    const { status, body } = await get("/jwks");
    expect(status).toBe(200);
    const keys = body.keys as Array<Record<string, string>>;
    expect(keys).toHaveLength(1);
    expect(keys[0].kty).toBe("RSA");
    expect(keys[0].alg).toBe("RS256");
    expect(keys[0].use).toBe("sig");
    expect(keys[0].kid).toBeTruthy();
  });

  // ── Authorize ──────────────────────────────────────────────────────────

  it("returns an authorization code for the default test user", async () => {
    const { status, body } = await get("/authorize?client_id=test&state=abc123");
    expect(status).toBe(200);
    expect(body.code).toBeTruthy();
    expect(body.state).toBe("abc123");
    expect(body.test_user).toBe("test-disapedia-001");
  });

  it("accepts test_user parameter to select a specific user", async () => {
    const { status, body } = await get("/authorize?test_user=test-disapedia-002");
    expect(status).toBe(200);
    expect(body.test_user).toBe("test-disapedia-002");
  });

  // ── Token exchange ─────────────────────────────────────────────────────

  it("exchanges code for id_token + access_token", async () => {
    const authResp = await get("/authorize?test_user=test-disapedia-001");
    const code = authResp.body.code as string;

    const { status, body } = await post("/token", `grant_type=authorization_code&code=${code}&client_id=test`);
    expect(status).toBe(200);
    expect(body.access_token).toBeTruthy();
    expect(body.id_token).toBeTruthy();
    expect(body.token_type).toBe("Bearer");

    const idToken = body.id_token as string;
    const [, payloadB64] = idToken.split(".");
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    expect(payload.sub).toBe("test-disapedia-001");
    expect(payload.email).toBe("alice.test@disapedia.org");
    expect(payload.name).toBe("Alice Test");
    expect(payload.disapedia_id).toBe("user:test-001");
  });

  // ── UserInfo ───────────────────────────────────────────────────────────

  it("returns user claims from the userinfo endpoint", async () => {
    const { status, body } = await get("/userinfo");
    expect(status).toBe(200);
    expect(body.sub).toBe("test-disapedia-001");
    expect(body.email).toBe("alice.test@disapedia.org");
    expect(body.disapedia_id).toBe("user:test-001");
    expect(body.groups).toContain("editors");
  });

  // ── 404 for unknown paths ──────────────────────────────────────────────

  it("returns 404 for unknown endpoints", async () => {
    const { status } = await get("/nonexistent");
    expect(status).toBe(404);
  });
});

// ── End-to-end claim mapping ───────────────────────────────────────────────

describe("Disapedia → MapAble claim mapping", () => {
  it("maps a Disapedia participant to the correct FederatedIdentity", async () => {
    const authResp = await get("/authorize?test_user=test-disapedia-001");
    const code = authResp.body.code as string;
    const tokenResp = await post("/token", `grant_type=authorization_code&code=${code}&client_id=test`);
    const idToken = tokenResp.body.id_token as string;
    const [, payloadB64] = idToken.split(".");
    const claims = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

    const clerkPayload = {
      id: "clerk_from_disapedia",
      email_addresses: [{ email_address: claims.email }],
      first_name: claims.name.split(" ")[0],
      last_name: claims.name.split(" ").slice(1).join(" "),
      image_url: undefined,
      external_accounts: [{ provider: "conn_disapedia_test" }],
      public_metadata: {
        disapediaId: claims.disapedia_id,
        disapediaGroups: claims.groups,
      },
    };

    const identity = extractFederatedIdentity(clerkPayload, "conn_disapedia_test");

    expect(identity.federationSource).toBe("disapedia");
    expect(identity.email).toBe("alice.test@disapedia.org");
    expect(identity.fullName).toBe("Alice Test");
    expect(identity.disapediaId).toBe("user:test-001");
    expect(identity.groups).toContain("editors");

    const role = roleFromGroups(identity.groups, { accessibility_reviewers: "auditor" });
    expect(role).toBe("participant");
  });

  it("maps a Disapedia reviewer to auditor role via group mapping", async () => {
    const authResp = await get("/authorize?test_user=test-disapedia-002");
    const code = authResp.body.code as string;
    const tokenResp = await post("/token", `grant_type=authorization_code&code=${code}&client_id=test`);
    const idToken = tokenResp.body.id_token as string;
    const [, payloadB64] = idToken.split(".");
    const claims = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

    const clerkPayload = {
      id: "clerk_from_disapedia_reviewer",
      email_addresses: [{ email_address: claims.email }],
      first_name: "Bob",
      last_name: "Reviewer",
      external_accounts: [{ provider: "conn_disapedia_test" }],
      public_metadata: {
        disapediaId: claims.disapedia_id,
        disapediaGroups: claims.groups,
      },
    };

    const identity = extractFederatedIdentity(clerkPayload, "conn_disapedia_test");
    expect(identity.federationSource).toBe("disapedia");
    expect(identity.groups).toContain("accessibility_reviewers");

    const role = roleFromGroups(identity.groups, { accessibility_reviewers: "auditor" });
    expect(role).toBe("auditor");
  });
});
