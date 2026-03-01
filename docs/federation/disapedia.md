# Disapedia Federation Plan

> OpenID Connect federation between MapAble and Disapedia (MediaWiki IdP).

## 1. Protocol Choice: OpenID Connect (OIDC)

| Decision | Rationale |
|---|---|
| **Protocol** | OIDC 1.0 (Authorization Code Flow with PKCE) |
| **Why not SAML** | Disapedia runs MediaWiki with the OpenID Connect extension — OIDC is native. SAML would require a bridge. |
| **Why not OAuth2 alone** | OAuth2 provides authorisation but not identity. OIDC adds the `id_token` with standardised claims (`sub`, `email`, `name`). |
| **Flow variant** | Authorization Code with PKCE — no client secret exposed to the browser. Clerk handles the flow; MapAble never touches raw tokens. |

## 2. Architecture

MapAble does **not** act as an OIDC Relying Party directly. Instead:

1. **Clerk** is the RP (Relying Party) that connects to Disapedia as an Enterprise SSO connection.
2. **Disapedia** is the OP (OpenID Provider) via its MediaWiki OIDC extension.
3. **MapAble** trusts Clerk sessions — it never sees Disapedia tokens.

This means:
- No OIDC library in the MapAble codebase
- No token storage or refresh logic
- No custom callback URL handling
- Clerk manages key rotation, token validation, and session lifecycle

## 3. Flow Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │     │    Clerk     │     │  Disapedia   │     │   MapAble    │
│  (Next.js)   │     │  (SSO Hub)   │     │ (MediaWiki)  │     │  (Backend)   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
  1.   │─── Click "Log in   │                    │                    │
       │    with Disapedia" │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
  2.   │                    │── OIDC auth req ──>│                    │
       │                    │  (code + PKCE)     │                    │
       │                    │                    │                    │
  3.   │<───────────────────│<── Redirect to ────│                    │
       │  Redirect to       │   Disapedia login  │                    │
       │  Disapedia login   │                    │                    │
       │───────────────────────────────────────>│                    │
       │                    │                    │                    │
  4.   │  User authenticates on Disapedia        │                    │
       │  (username/password or existing session) │                    │
       │                    │                    │                    │
  5.   │<──────────────────────────────────────── Redirect back      │
       │  with auth code    │                    │  with auth code    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
  6.   │                    │── Token exchange ─>│                    │
       │                    │  (code → id_token  │                    │
       │                    │   + access_token)  │                    │
       │                    │<── id_token ───────│                    │
       │                    │                    │                    │
  7.   │                    │── Validate id_token │                    │
       │                    │   (sig, iss, aud,  │                    │
       │                    │    exp, nonce)     │                    │
       │                    │                    │                    │
  8.   │                    │── Map claims to ───│──────────────────>│
       │                    │   Clerk user       │  Webhook:          │
       │                    │                    │  user.created      │
       │                    │                    │                    │
  9.   │                    │                    │                    │── Upsert users row
       │                    │                    │                    │── Assign participant
       │                    │                    │                    │   role (default)
       │                    │                    │                    │── audit() login
       │                    │                    │                    │
 10.   │<── Clerk session ──│                    │                    │
       │    cookie set      │                    │                    │
       │                    │                    │                    │
 11.   │── API request ─────│────────────────────│───────────────────>│
       │   (Clerk JWT in    │                    │  getAuthContext()  │
       │    session cookie) │                    │  resolves user +   │
       │                    │                    │  roles from DB     │
```

## 4. Metadata Endpoints

### Disapedia (OpenID Provider)

Disapedia's MediaWiki instance exposes OIDC metadata at a well-known URL:

| Endpoint | URL |
|---|---|
| **Discovery** | `https://disapedia.org/.well-known/openid-configuration` |
| **Authorization** | `https://disapedia.org/wiki/Special:OAuth2/authorize` |
| **Token** | `https://disapedia.org/wiki/Special:OAuth2/token` |
| **UserInfo** | `https://disapedia.org/wiki/Special:OAuth2/userinfo` |
| **JWKS** | `https://disapedia.org/wiki/Special:OAuth2/jwks` |

These URLs follow the MediaWiki OAuth2/OIDC extension conventions. The
actual base URL will be confirmed during onboarding.

### Clerk (Relying Party)

Clerk's callback URL for this SSO connection:

```
https://clerk.mapable.au/v1/saml/acs/<connection_id>
```

(Clerk uses the same ACS path format for both SAML and OIDC connections.
The `connection_id` is assigned when the connection is created in the
Clerk dashboard.)

## 5. Claims Mapping

### id_token claims from Disapedia

| OIDC Claim | Type | Example | Required |
|---|---|---|---|
| `sub` | string | `"12345"` | Yes |
| `email` | string | `"alice@example.com"` | Yes |
| `email_verified` | boolean | `true` | Yes |
| `name` | string | `"Alice Johnson"` | Yes |
| `preferred_username` | string | `"AliceJ"` | No |
| `picture` | string (URL) | `"https://disapedia.org/avatar/12345.jpg"` | No |
| `disapedia_id` | string | `"user:12345"` | No (custom) |
| `groups` | string[] | `["editors", "accessibility_reviewers"]` | No (custom) |

### Clerk user attribute mapping

| Disapedia Claim | Clerk Attribute | MapAble Usage |
|---|---|---|
| `sub` | `externalId` | Correlation key — never changes |
| `email` | `emailAddresses[0]` | Primary contact, unique key in `users` |
| `name` | `firstName` + `lastName` | Display name in `users.full_name` |
| `picture` | `imageUrl` | Avatar in `users.avatar_url` |
| `disapedia_id` | `publicMetadata.disapediaId` | Cross-reference for Disapedia content linking |
| `groups` | `publicMetadata.disapediaGroups` | Future: auto-assign auditor role for reviewers |

### Scopes requested

```
openid profile email
```

Custom scope `disapedia_identity` may be negotiated for the `disapedia_id`
and `groups` claims.

## 6. Session / Token Trust Model

### Trust chain

```
Disapedia (OP)
  ├── Signs id_token with its private key (RS256)
  ├── JWKS published at /.well-known/openid-configuration → jwks_uri
  │
Clerk (RP + Session Manager)
  ├── Validates id_token signature against Disapedia JWKS
  ├── Checks: iss, aud, exp, nonce, email_verified
  ├── Creates/links Clerk user (JIT provisioning)
  ├── Issues Clerk session token (short-lived JWT, 60s default)
  ├── Fires user.created webhook to MapAble
  │
MapAble (Application)
  ├── Trusts Clerk session tokens (verified by Clerk middleware)
  ├── Never sees Disapedia tokens
  ├── Maps clerk_id → users.id in every request
  ├── Enforces RBAC via roles table
  └── Enforces RLS via Postgres session variables
```

### Token lifetimes

| Token | Issuer | Lifetime | Storage |
|---|---|---|---|
| Disapedia id_token | Disapedia | 5–10 min | Clerk only (never reaches MapAble) |
| Disapedia access_token | Disapedia | 1 hour | Clerk only (used for UserInfo fetch) |
| Clerk session JWT | Clerk | 60 seconds | httpOnly cookie, auto-refreshed |
| Clerk refresh token | Clerk | 7 days | httpOnly cookie |

### Revocation

- **Disapedia disables account** → next Clerk token refresh fails → session ends
- **Clerk admin suspends user** → all sessions invalidated immediately
- **MapAble sets `users.active = false`** → `getAuthContext()` returns null → 401

### What MapAble DOES NOT do

- Never stores Disapedia tokens (id_token, access_token, refresh_token)
- Never calls Disapedia APIs directly
- Never validates Disapedia JWTs (Clerk does this)
- Never implements OIDC callback handling (Clerk does this)

## 7. JIT Provisioning Logic

When a Disapedia user logs in for the first time:

```
Clerk webhook: user.created
  │
  ▼
POST /api/auth/webhook
  │
  ├── Extract from Clerk payload:
  │     clerkId    = data.id
  │     email      = data.email_addresses[0].email_address
  │     fullName   = data.first_name + " " + data.last_name
  │     avatarUrl  = data.image_url
  │     disapediaId = data.public_metadata.disapediaId
  │
  ├── syncUserFromClerk({ clerkId, email, fullName, avatarUrl })
  │     → INSERT INTO users (clerk_id, email, full_name, avatar_url)
  │     → INSERT INTO roles (user_id, role) VALUES ($1, 'participant')
  │
  ├── audit({ action: "login", summary: "First login via Disapedia SSO" })
  │
  └── Return { userId, created: true }
```

On subsequent logins, `user.updated` webhook fires (in case email/name
changed in Disapedia) → `syncUserFromClerk()` updates the existing row.

## 8. Security Considerations

| Concern | Mitigation |
|---|---|
| Token theft | Clerk session JWTs are httpOnly, Secure, SameSite=Lax. 60s lifetime limits exposure. |
| IdP compromise | Clerk validates id_token signature against Disapedia JWKS. Key rotation is handled automatically. |
| Account linking collision | Clerk uses `sub` (stable) not `email` for identity. Email changes don't create duplicates. |
| Privilege escalation | MapAble assigns `participant` role by default. Coordinator/admin roles require manual assignment. |
| Consent bypass | Federated users still need active consent records before accessing participant data (RLS enforced). |
| Session fixation | Clerk generates a new session on every authentication event. |
| CSRF | Clerk uses `state` + `nonce` parameters in OIDC flow. PKCE prevents code interception. |

## 9. Rollback Plan

If federation needs to be disabled:

1. Disable the Disapedia SSO connection in Clerk dashboard
2. Disapedia-sourced users can still log in via email/password (if they set one)
3. Existing `users` rows and role assignments are unaffected
4. No data loss — the `clerk_id` still maps to the same user
