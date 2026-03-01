/**
 * tools/mock-disapedia-idp/fixtures.ts — Test users and keys for the mock IdP.
 *
 * These match the test_users in config/federation/disapedia-oidc.test.json.
 */

export interface TestUser {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  preferred_username: string;
  picture: string;
  disapedia_id: string;
  groups: string[];
}

export const TEST_USERS: TestUser[] = [
  {
    sub: "test-disapedia-001",
    email: "alice.test@disapedia.org",
    email_verified: true,
    name: "Alice Test",
    preferred_username: "AliceTest",
    picture: "https://disapedia.org/avatar/test-001.jpg",
    disapedia_id: "user:test-001",
    groups: ["editors"],
  },
  {
    sub: "test-disapedia-002",
    email: "bob.reviewer@disapedia.org",
    email_verified: true,
    name: "Bob Reviewer",
    preferred_username: "BobReviewer",
    picture: "https://disapedia.org/avatar/test-002.jpg",
    disapedia_id: "user:test-002",
    groups: ["editors", "accessibility_reviewers"],
  },
  {
    sub: "test-disapedia-003",
    email: "charlie.inactive@disapedia.org",
    email_verified: false,
    name: "Charlie Inactive",
    preferred_username: "CharlieInactive",
    picture: "",
    disapedia_id: "user:test-003",
    groups: [],
  },
];

/**
 * A test-only RSA public key in JWK format.
 * The mock IdP doesn't actually sign tokens with this key (it uses alg: "none"
 * for simplicity), but the JWKS endpoint returns it so clients that validate
 * the discovery document see a well-formed key set.
 *
 * In production, Clerk validates Disapedia's real RS256 signatures.
 */
export const TEST_RSA_PUBLIC_KEY_JWK = {
  kty: "RSA",
  kid: "mock-disapedia-key-1",
  use: "sig",
  alg: "RS256",
  n: "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw",
  e: "AQAB",
};
