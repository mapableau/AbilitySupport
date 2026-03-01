# Mock Disapedia OIDC Provider

A lightweight mock OIDC identity provider that simulates Disapedia's
MediaWiki OAuth extension for local development and CI testing.

## Quick Start

```bash
pnpm mock:idp
```

The server starts on `http://localhost:4180` (matching the test federation
config at `config/federation/disapedia-oidc.test.json`).

## Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/.well-known/openid-configuration` | GET | OIDC discovery document |
| `/jwks` | GET | JSON Web Key Set |
| `/authorize` | GET | Authorization redirect (returns code) |
| `/token` | POST | Token exchange (code → id_token) |
| `/userinfo` | GET | User claims (Bearer token) |
| `/health` | GET | Health check |

## Test Users

| sub | email | groups | Expected role |
|---|---|---|---|
| `test-disapedia-001` | alice.test@disapedia.org | editors | participant |
| `test-disapedia-002` | bob.reviewer@disapedia.org | editors, accessibility_reviewers | auditor |
| `test-disapedia-003` | charlie.inactive@disapedia.org | (none) | participant |

## Selecting a Test User

Pass `test_user=<sub>` as a query parameter to `/authorize`:

```
http://localhost:4180/authorize?client_id=test-mapable-client&redirect_uri=...&test_user=test-disapedia-002
```

## Token Format

Tokens use `alg: "none"` for simplicity. The JWKS endpoint returns a
well-formed RSA public key, but signatures are not cryptographically
verified in test mode. In production, Clerk validates real RS256
signatures from the actual Disapedia instance.

## Integration with MapAble

This mock doesn't replace Clerk — it simulates what Disapedia looks like
to Clerk. For end-to-end testing:

1. Start the mock IdP: `pnpm mock:idp`
2. Point Clerk's test SSO connection to `http://localhost:4180`
3. Log in via Clerk → Clerk redirects to mock → mock returns claims
4. Clerk webhook fires → MapAble syncs user
