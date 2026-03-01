# Environment Variables

> Complete reference for all MapAble environment variables.

`lib/env.ts` validates every variable at startup using Zod. If any required
variable is missing or malformed, the process exits immediately with a
formatted error listing every issue. This ensures broken config never
reaches runtime.

## Quick Setup (Local Development)

```bash
# 1. Copy the template
cp .env.example .env.local

# 2. Fill in the required values (see table below)
#    At minimum you need: DATABASE_URL, CLERK_SECRET_KEY,
#    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, TYPESENSE_HOST,
#    TYPESENSE_API_KEY, INNGEST_EVENT_KEY

# 3. Start the dev server — env is validated on startup
pnpm start:dev
```

## Variable Reference

### Always Required

These must be set in every environment (local, staging, production).

| Variable | Format | Where to get it |
|---|---|---|
| `DATABASE_URL` | `postgresql://...?sslmode=require` | Neon console → Connection Details → Pooled connection string |
| `CLERK_SECRET_KEY` | `sk_test_...` or `sk_live_...` | Clerk dashboard → API Keys |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` | Clerk dashboard → API Keys |
| `TYPESENSE_HOST` | `xyz.a1.typesense.net` | Typesense Cloud dashboard → Cluster → Host |
| `TYPESENSE_API_KEY` | string | Typesense Cloud dashboard → API Keys → Admin |
| `INNGEST_EVENT_KEY` | string | Inngest dashboard → Events → Event Key |

### Required in Production

Optional during local development. `lib/env.ts` enforces these only when
`NODE_ENV=production`.

| Variable | Format | Where to get it |
|---|---|---|
| `VERCEL_PROJECT_ID` | `prj_...` | Vercel dashboard → Project → Settings → General |
| `VERCEL_TOKEN` | string | Vercel dashboard → Account Settings → Tokens → Create |
| `INNGEST_SIGNING_KEY` | string | Inngest dashboard → Signing Key (used to verify webhook payloads) |
| `CLERK_WEBHOOK_SECRET` | `whsec_...` | Clerk dashboard → Webhooks → Signing Secret |

### Federation SSO (Optional)

These connect MapAble to external identity providers via Clerk Enterprise
SSO. The SSO flows themselves are configured entirely in the Clerk
dashboard — these env vars just pass the connection IDs into the app so it
can identify which provider a login came from.

| Variable | Format | Where to get it |
|---|---|---|
| `CLERK_SSO_DISAPEDIA_CONNECTION_ID` | `conn_...` | Clerk dashboard → Enterprise SSO → Disapedia OIDC → Connection ID |
| `CLERK_SSO_ACCESSIBOOKS_CONNECTION_ID` | `conn_...` | Clerk dashboard → Enterprise SSO → AccessiBooks SAML → Connection ID |

See `docs/FEDERATION.md` for detailed setup instructions for each provider.

### Optional

Feature-specific variables. The app runs without them, but some features
will be degraded.

| Variable | Default | Purpose |
|---|---|---|
| `TYPESENSE_SEARCH_KEY` | — | Scoped search-only key safe for client-side use |
| `TYPESENSE_PORT` | `443` | Typesense port (usually 443 for Cloud) |
| `TYPESENSE_PROTOCOL` | `https` | Protocol (`https` or `http`) |
| `OPENAI_API_KEY` | — | OpenAI API key for AI chat features |
| `ANTHROPIC_API_KEY` | — | Anthropic API key (alternative AI provider) |
| `BLOB_READ_WRITE_TOKEN` | — | Vercel Blob token for evidence uploads |
| `NODE_ENV` | `development` | `development`, `test`, or `production` |

## Setting Variables in Vercel

### Via Dashboard

1. Go to your Vercel project → Settings → Environment Variables
2. Add each variable with the appropriate scope:
   - **Production**: `main` branch deploys
   - **Preview**: PR branch deploys
   - **Development**: `vercel dev` local proxy
3. Sensitive values (API keys, tokens) should be marked as **Sensitive**
   in the Vercel UI — they will be encrypted and not visible after saving.

### Via CLI

```bash
# Set a variable for production
vercel env add DATABASE_URL production

# Set for all environments
vercel env add CLERK_SECRET_KEY production preview development

# Pull all env vars to .env.local for local dev
vercel env pull .env.local
```

### Per-Environment Values

Some variables should differ between environments:

| Variable | Production | Preview | Development |
|---|---|---|---|
| `DATABASE_URL` | Neon primary | Neon branch (auto via integration) | Neon dev branch |
| `CLERK_SECRET_KEY` | `sk_live_...` | `sk_test_...` | `sk_test_...` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | `pk_test_...` | `pk_test_...` |
| `NODE_ENV` | `production` | `production` | `development` |

## How Validation Works

`lib/env.ts` runs validation at import time:

```
Process starts
  → lib/env.ts imported
  → Zod parses process.env against serverSchema
  → If valid: exports typed `env` object
  → If invalid: prints formatted error → process.exit(1)
```

The error output looks like:

```
┌─────────────────────────────────────────────┐
│  ⚠  Missing or invalid environment variables │
└─────────────────────────────────────────────┘

  ✗ DATABASE_URL: Invalid input: expected string, received undefined
  ✗ CLERK_SECRET_KEY: Invalid input: expected string, received undefined
  ✗ VERCEL_PROJECT_ID: Required in production

Environment: production
Hint: copy .env.example to .env.local and fill in the values.
See docs/ENVIRONMENT.md for the full reference.
```

### Production vs Development

Variables marked "required in production" use a dynamic Zod rule:

```typescript
const isProd = currentNodeEnv === "production";
function requiredInProd() {
  return isProd
    ? z.string().min(1, "Required in production")
    : z.string().min(1).optional();
}
```

In development, these variables are typed as `string | undefined`. In
production, they are required — the build fails if missing. This prevents
deploying with incomplete config while keeping local setup simple.

## Neon + Vercel Integration

For automatic per-PR database branches:

1. Install the Neon integration in Vercel dashboard
2. Link your Neon project to your Vercel project
3. The integration auto-sets `DATABASE_URL` for each preview deploy
   (pointing to a copy-on-write branch of the staging database)
4. On PR close, the branch is automatically deleted

This means `DATABASE_URL` in preview environments is managed by the
integration — you do not need to set it manually for preview deploys.
