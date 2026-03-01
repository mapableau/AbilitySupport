# Federation — Disapedia + AccessiBooks SSO

> Design document for external identity federation.

See [ARCHITECTURE.md](../ARCHITECTURE.md) § 2 for the high-level overview.

## Disapedia (OIDC)

Disapedia is the disability community identity platform. NDIS participants
who already have a Disapedia account can log in to MapAble without creating
a new identity.

### Configuration

1. Register MapAble as an OIDC client in the Disapedia developer portal
2. Add the OIDC connection in Clerk dashboard → Enterprise SSO
3. Set the callback URL to Clerk's SSO callback endpoint
4. Map Disapedia claims → Clerk user attributes:
   - `sub` → `externalId`
   - `email` → `emailAddress`
   - `name` → `firstName` + `lastName`
   - `disapedia_id` → `publicMetadata.disapediaId`

### JIT Provisioning

On first login, Clerk creates the user. The `user.created` webhook handler
in MapAble:
1. Inserts a row into `users` (clerk_id, email, full_name)
2. Assigns the `participant` role (default for Disapedia-sourced users)
3. Notifies the assigned coordinator to complete the profile

## AccessiBooks (SAML 2.0)

AccessiBooks is the accounting / plan management platform used by some
coordination agencies. Coordinators and plan managers authenticate via
their organisation's AccessiBooks tenant.

### Configuration

1. Exchange SAML metadata with AccessiBooks (entity ID, ACS URL, certificate)
2. Add the SAML connection in Clerk dashboard → Enterprise SSO
3. Map AccessiBooks SAML assertions:
   - `NameID` → user email
   - `org_id` attribute → `publicMetadata.accessibooksOrgId`
   - `role` attribute → used for auto-role assignment

### Org Linking

When the SAML assertion includes an `org_id` claim:
1. Webhook handler looks up `organisations` by a metadata field
2. If found, auto-assigns `provider_admin` role for that org
3. If not found, creates the org in `pending` verification state

## Security Considerations

- All federation flows go through Clerk (no custom token handling)
- Federated users still require active consent records before accessing participant data
- Session tokens are short-lived JWTs (Clerk default: 60s), refreshed transparently
- Clerk handles MFA enforcement per org policy
