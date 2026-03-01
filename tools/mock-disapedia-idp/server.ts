/**
 * tools/mock-disapedia-idp/server.ts — Mock Disapedia OIDC Provider.
 *
 * A minimal OIDC-compliant identity provider that simulates Disapedia's
 * MediaWiki OAuth extension. Returns deterministic test users for
 * development and CI integration testing.
 *
 * Endpoints:
 *   /.well-known/openid-configuration  — OIDC discovery document
 *   /jwks                              — JSON Web Key Set
 *   /authorize                         — authorization redirect
 *   /token                             — token exchange (code → id_token)
 *   /userinfo                          — user claims
 *
 * Usage:
 *   npx ts-node tools/mock-disapedia-idp/server.ts
 *   # or
 *   pnpm mock:idp
 *
 * This server runs on port 4180 by default (matching the test config).
 */

import * as http from "node:http";
import * as crypto from "node:crypto";
import { TEST_USERS, TEST_RSA_PUBLIC_KEY_JWK } from "./fixtures.js";

const PORT = Number(process.env.MOCK_IDP_PORT ?? 4180);
const ISSUER = `http://localhost:${PORT}`;

const pendingCodes = new Map<string, string>();

function jsonResponse(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function handleDiscovery(_req: http.IncomingMessage, res: http.ServerResponse): void {
  jsonResponse(res, 200, {
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/authorize`,
    token_endpoint: `${ISSUER}/token`,
    userinfo_endpoint: `${ISSUER}/userinfo`,
    jwks_uri: `${ISSUER}/jwks`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "profile", "email", "disapedia_identity"],
    claims_supported: [
      "sub", "email", "email_verified", "name",
      "preferred_username", "picture", "disapedia_id", "groups",
    ],
    code_challenge_methods_supported: ["S256"],
  });
}

function handleJwks(_req: http.IncomingMessage, res: http.ServerResponse): void {
  jsonResponse(res, 200, { keys: [TEST_RSA_PUBLIC_KEY_JWK] });
}

function handleAuthorize(req: http.IncomingMessage, res: http.ServerResponse): void {
  const url = new URL(req.url ?? "/", ISSUER);
  const redirectUri = url.searchParams.get("redirect_uri");
  const state = url.searchParams.get("state") ?? "";

  const testUserId = url.searchParams.get("test_user") ?? "test-disapedia-001";

  const code = crypto.randomUUID();
  pendingCodes.set(code, testUserId);

  if (redirectUri) {
    const callback = new URL(redirectUri);
    callback.searchParams.set("code", code);
    callback.searchParams.set("state", state);
    res.writeHead(302, { Location: callback.toString() });
    res.end();
  } else {
    jsonResponse(res, 200, { code, state, test_user: testUserId });
  }
}

function handleToken(req: http.IncomingMessage, res: http.ServerResponse): void {
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    const params = new URLSearchParams(body);
    const code = params.get("code") ?? "";
    const testUserId = pendingCodes.get(code);

    if (!testUserId) {
      jsonResponse(res, 400, { error: "invalid_grant", error_description: "Unknown or expired code" });
      return;
    }
    pendingCodes.delete(code);

    const user = TEST_USERS.find((u) => u.sub === testUserId) ?? TEST_USERS[0];

    const now = Math.floor(Date.now() / 1000);
    const idTokenPayload = {
      iss: ISSUER,
      sub: user.sub,
      aud: params.get("client_id") ?? "test-mapable-client",
      exp: now + 600,
      iat: now,
      nonce: params.get("nonce") ?? "",
      email: user.email,
      email_verified: user.email_verified,
      name: user.name,
      preferred_username: user.preferred_username,
      picture: user.picture,
      disapedia_id: user.disapedia_id,
      groups: user.groups,
    };

    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify(idTokenPayload)).toString("base64url");
    const idToken = `${header}.${payload}.mock-signature`;

    jsonResponse(res, 200, {
      access_token: `mock-access-${code}`,
      token_type: "Bearer",
      expires_in: 3600,
      id_token: idToken,
      scope: "openid profile email",
    });
  });
}

function handleUserInfo(req: http.IncomingMessage, res: http.ServerResponse): void {
  const auth = req.headers.authorization ?? "";
  const token = auth.replace("Bearer ", "");

  const testUserIndex = token.includes("002") ? 1 : 0;
  const user = TEST_USERS[testUserIndex];

  jsonResponse(res, 200, {
    sub: user.sub,
    email: user.email,
    email_verified: user.email_verified,
    name: user.name,
    preferred_username: user.preferred_username,
    picture: user.picture,
    disapedia_id: user.disapedia_id,
    groups: user.groups,
  });
}

function handleHealth(_req: http.IncomingMessage, res: http.ServerResponse): void {
  jsonResponse(res, 200, {
    status: "ok",
    issuer: ISSUER,
    users: TEST_USERS.length,
    description: "Mock Disapedia OIDC Provider for MapAble development",
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", ISSUER);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  if (path === "/.well-known/openid-configuration") return handleDiscovery(req, res);
  if (path === "/jwks") return handleJwks(req, res);
  if (path === "/authorize") return handleAuthorize(req, res);
  if (path === "/token" && req.method === "POST") return handleToken(req, res);
  if (path === "/userinfo") return handleUserInfo(req, res);
  if (path === "/health" || path === "/") return handleHealth(req, res);

  jsonResponse(res, 404, { error: "not_found", path });
});

server.listen(PORT, () => {
  console.log(`\n🔐 Mock Disapedia OIDC Provider running at ${ISSUER}`);
  console.log(`   Discovery: ${ISSUER}/.well-known/openid-configuration`);
  console.log(`   Test users: ${TEST_USERS.map((u) => u.sub).join(", ")}\n`);
});
