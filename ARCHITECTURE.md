# MapAble — Architecture

> AI-assisted support coordination for Care + Transport (NDIS).

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 15 App Router | SSR pages, API routes, server actions |
| Language | TypeScript (strict) | End-to-end type safety |
| Database | Neon Postgres | Serverless Postgres with PostGIS + pgvector |
| ORM | Drizzle ORM | Type-safe queries, migrations via Drizzle Kit |
| Search | Typesense Cloud | Full-text, geo, faceted search with real-time indexing |
| Workflows | Inngest | Event-driven background jobs, cron, retries |
| Auth | Clerk | SSO, MFA, org membership, JWT sessions |
| AI | Vercel AI SDK | streamText orchestration, tool calling |
| Storage | Vercel Blob | Document/evidence uploads |
| Hosting | Vercel | Edge-first, preview deploys, ISR |

---

## 1. Authentication Spine

All auth flows go through `lib/auth`, which wraps Clerk and exposes three
context resolvers. Route handlers never import Clerk primitives directly.

```
Request → Clerk middleware (JWT verify) → lib/auth/session.ts
  ├── getAuthContext()         → AuthContext { userId, clerkId, roles }
  ├── getOrgScopedAuth()       → OrgScopedAuthContext { + organisationId, orgRole }
  └── getCoordinatorAuth()     → CoordinatorAuthContext { + role: coordinator|admin }
```

### Identity mapping

Clerk owns the external identity (SSO, MFA, email). Our `users` table
mirrors Clerk via `clerk_id` and holds the internal `uuid` PK that every
FK in the system references. The Clerk → internal user sync happens:

1. **On first login** — Clerk webhook `user.created` → upsert into `users`
2. **On profile change** — Clerk webhook `user.updated` → update `users`
3. **On every request** — `getAuthContext()` resolves `clerk_id → users.id`

### Role model

```
users ──< roles >── organisations
         │
         role ∈ { admin, coordinator, participant, provider_admin, worker }
         organisation_id nullable (NULL = global role)
```

- `admin` — platform operator, full access
- `coordinator` — manages participants, reviews queue, approves matches
- `participant` — NDIS participant (view own data, submit feedback)
- `provider_admin` — manages workers/vehicles/availability for their org
- `worker` — assigned support worker (view own shifts)

### Route protection

```
app/api/coordinator/*   → getCoordinatorAuth()  → 401 if not coordinator|admin
app/api/provider/*      → getOrgScopedAuth()    → 401 if not provider_admin for that org
app/api/followups/*     → getAuthContext()       → 401 if not logged in
```

---

## 2. Federation — Disapedia + AccessiBooks SSO

MapAble federates with two external identity platforms:

| Platform | Protocol | Purpose |
|---|---|---|
| **Disapedia** | OIDC (OpenID Connect) | Disability community identity — participants log in with their existing Disapedia account |
| **AccessiBooks** | SAML 2.0 | Accounting/plan management — coordinators and plan managers authenticate via their org's AccessiBooks tenant |

### Flow

```
User clicks "Log in with Disapedia"
  → Clerk Enterprise SSO (OIDC)
  → Disapedia authorises, returns id_token
  → Clerk creates/links user
  → MapAble Clerk webhook syncs to users table
  → lib/auth resolves roles from our roles table
```

### Implementation plan

1. **Clerk Enterprise SSO connections** — configure OIDC (Disapedia) and SAML (AccessiBooks) in Clerk dashboard
2. **JIT provisioning** — on first federated login, Clerk webhook creates the `users` row; a coordinator assigns roles via admin UI
3. **Org linking** — AccessiBooks SAML assertions include an `org_id` claim; the webhook handler matches it to `organisations.id` and auto-assigns `provider_admin` role
4. **No custom IdP code** — Clerk handles all token exchange, session management, and refresh. MapAble only reads the resolved identity.

---

## 3. Organisation Skeleton

Organisations are the central tenancy unit. Every worker, vehicle, booking,
and recommendation is scoped to an organisation.

```
organisations
  ├── organisation_claims    (verification workflow: pending → approved | rejected)
  ├── workers                (staff with capabilities + clearance tracking)
  ├── vehicles               (fleet with WAV flags + capacity)
  ├── availability_slots     (worker/vehicle time windows)
  ├── bookings               (service appointments)
  └── recommendations        (AI-ranked match suggestions)
```

### Lifecycle

```
1. Org record created (by admin import or provider sign-up)
2. Provider admin claims the org → organisation_claims row
3. Admin reviews claim (checks ABN, insurance) → approved/rejected
4. On approval: org.verified = true, claimant gets provider_admin role
5. Provider admin adds workers, vehicles, availability
6. Inngest indexes org + workers into Typesense
7. Recommendation pipeline finds org for participant requests
```

### Key fields

| Table | Field | Purpose |
|---|---|---|
| `organisations` | `verified` | Has passed ABN + insurance check |
| `organisations` | `org_type` | `care`, `transport`, or `both` |
| `organisations` | `location` | `geography(Point, 4326)` for proximity search |
| `workers` | `capabilities[]` | Independent of `worker_role` — a support worker can also drive |
| `workers` | `clearance_status` | `pending`, `cleared`, `expired`, `revoked` |
| `evidence_refs` | polymorphic | Attached proof (docs, URLs, notes) per org/worker |

---

## 4. Consent / Privacy / RLS Structure

NDIS participants are vulnerable individuals. Data access is strictly
consent-gated and audit-logged.

### Consent model

```
consents
  participant_profile_id  → who gave consent
  consent_type            → what they consented to
  granted_by              → who actioned it (participant or guardian)
  granted_at / expires_at / revoked_at → temporal validity
  document_url            → signed consent form (Vercel Blob)
```

Consent types: `data_sharing`, `service_agreement`, `plan_management`,
`transport`, `medical_info`.

### Access rules

| Data | Who can see it | Enforcement |
|---|---|---|
| Participant profile | The participant + their coordinator | App-layer check: `getAuthContext()` → verify ownership or coordinator assignment |
| NDIS number | Coordinator only | Never returned to provider routes |
| Provider pool (workers, vehicles) | Provider admin for that org | `getOrgScopedAuth()` → verify `organisationId` match |
| Recommendations | Coordinator who requested | Scoped by `coordination_requests.requested_by` |
| Followup responses | Participant + coordinator | App-layer check |
| Evidence refs | Coordinator + provider admin for attached entity | App-layer check |

### Row-Level Security (RLS) — planned

Once Drizzle schema is updated to match `0001_core.sql`, RLS policies
will be added at the Postgres level as a defence-in-depth layer:

```sql
-- Participants can only see their own profile
CREATE POLICY participant_own_profile ON participant_profiles
  FOR SELECT USING (user_id = current_setting('app.user_id')::uuid);

-- Provider admins can only see workers in their org
CREATE POLICY provider_own_workers ON workers
  FOR ALL USING (organisation_id = current_setting('app.org_id')::uuid);
```

The app sets `app.user_id` and `app.org_id` via `SET LOCAL` at the start
of each request (inside `withTransaction()`). This ensures that even if
app-layer checks are bypassed, Postgres itself blocks unauthorised reads.

### Privacy principles

1. **Minimum necessary** — API routes return only the fields the caller needs
2. **Consent-gated** — participant data requires active, non-expired consent
3. **Audit trail** — `created_at`, `updated_at`, and `created_by`/`granted_by` on every table
4. **Soft deletes** — `active = false` instead of `DELETE`; data retained for audit
5. **No PII in search** — Typesense indexes org/worker data only; participant data stays in Postgres

---

## 5. Deployment Strategy (Vercel)

### Environments

| Environment | Branch | Database | Purpose |
|---|---|---|---|
| Production | `main` | Neon primary | Live traffic |
| Staging | `staging` | Neon branch | Pre-release validation |
| Preview | PR branches | Neon branch | Per-PR preview deploys |
| Local | — | Neon dev branch | Developer workstation |

### Neon branching

Each preview deploy gets its own Neon database branch (copy-on-write from
staging). Branch is created by the Neon–Vercel integration on PR open and
deleted on PR merge/close. Zero-cost when idle.

### Vercel configuration

```
Framework:    Next.js (auto-detected)
Build:        next build
Output:       .next/
Node:         22.x
Regions:      syd1 (primary — Australian users)
Edge:         Middleware + search API routes
Serverless:   All other API routes
ISR:          Public org pages (revalidate on Inngest event)
```

### Environment variables

Set in Vercel dashboard per environment. `lib/env.ts` validates at startup
and crashes with a clear error if any required var is missing.

### CI/CD flow

```
Push to PR branch
  → Vercel builds preview
  → Neon creates database branch
  → drizzle-kit migrate runs in build step
  → Preview URL shared in PR comment

Merge to main
  → Vercel deploys to production
  → drizzle-kit migrate against production Neon
  → Inngest functions auto-registered via /api/inngest
```

### Inngest in production

- Inngest Cloud connects to `POST /api/inngest` on the Vercel deployment
- Functions are registered on each deploy (PUT /api/inngest)
- Event keys and signing keys set as Vercel env vars
- Cron functions (nightly reindex) run on Inngest's scheduler

---

## Module Map

```
lib/
├── env.ts              # Zod-validated environment variables
├── auth/               # Clerk integration + role-based context resolvers
│   ├── session.ts      # getAuthContext, getOrgScopedAuth, getCoordinatorAuth
│   ├── types.ts        # AuthContext, OrgScopedAuthContext, CoordinatorAuthContext
│   └── index.ts
├── db/                 # Neon Postgres + Drizzle ORM
│   ├── client.ts       # HTTP driver singleton (edge-compatible)
│   ├── tx.ts           # WebSocket Pool for interactive transactions
│   ├── schema.ts       # Drizzle table definitions
│   └── index.ts
├── schemas/            # Zod validation schemas (shared server + client)
│   ├── enums.ts        # as-const arrays (single source for DB + API + UI)
│   ├── common.ts       # coordinates, address, pagination, uuid
│   ├── participant.ts, organisation.ts, worker.ts, booking.ts
│   ├── match-spec.ts   # MatchSpec from AI chat
│   ├── risk.ts         # RiskTier + gating decisions
│   ├── recommendation.ts, availability.ts, followup.ts, evidence.ts
│   └── index.ts
├── risk/               # Deterministic risk policy engine (pure functions)
│   ├── policy.ts       # evaluatePolicy() → PolicyDecision
│   ├── flags.ts        # Risk flag definitions + weights
│   └── scorer.ts       # scoreParticipantRisk()
├── search/             # Typesense Cloud integration
│   ├── client.ts       # Typesense client singleton
│   ├── collections.ts  # organisations_search, workers_search schemas
│   └── indexer/        # Document builders + bulk upsert
├── recommendations/    # Recommendation pipeline
│   ├── pipeline.ts     # Orchestrator: search → verify → score → hydrate
│   ├── search.ts       # Typesense query builder
│   ├── verify.ts       # Postgres hard-constraint checks
│   ├── score.ts        # Weighted scoring + confidence assignment
│   ├── hydrate.ts      # Merge search + DB into RecommendationCard DTO
│   └── card.ts         # RecommendationCard type definition
├── coordinator/        # Coordinator review queue data access
├── provider-pool/      # Provider admin CRUD (workers, availability, requests)
├── evidence/           # Evidence reference management
├── followups/          # Post-service follow-ups + signal analysis
├── workflows/          # Inngest event-driven workflows
│   ├── inngest/client.ts
│   ├── events.ts       # Typed event map
│   ├── indexing.ts     # Search reindex workflows
│   └── followups.ts    # Booking completed → followup → escalation
└── ai/                 # Vercel AI SDK orchestration
    ├── orchestrator.ts # streamText composition
    ├── tools.ts        # AI tool definitions
    └── prompts.ts      # System prompts
```

## Module Boundary Rules

1. **`lib/auth`** is the only module that touches Clerk. Everyone else imports auth contexts.
2. **`lib/db`** owns all SQL. No raw queries outside this module.
3. **`lib/schemas`** is the single source of truth for validation shapes. Drizzle defines the DB shape; Zod defines the API shape. They are deliberately separate.
4. **`lib/risk`** is pure functions — no DB calls, no side effects.
5. **`lib/search`** never writes to the DB. Indexing is orchestrated by `lib/workflows`.
6. **`lib/workflows`** functions must be idempotent (Inngest retries on failure).
7. **`lib/ai`** tool execute() functions are thin wrappers delegating to search/risk/db.
8. **`lib/env`** is the only module that reads `process.env`.
9. **`app/`** routes handle HTTP concerns + auth. Business logic lives in `lib/`.

## Environment Variables

| Variable | Module | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | `lib/db` | Yes | Neon pooled connection string |
| `CLERK_SECRET_KEY` | `lib/auth` | Yes | Clerk backend secret |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `app/` | Yes | Clerk frontend key |
| `TYPESENSE_HOST` | `lib/search` | Yes | Typesense Cloud host |
| `TYPESENSE_API_KEY` | `lib/search` | Yes | Admin API key (server only) |
| `TYPESENSE_SEARCH_KEY` | `lib/search` | No | Scoped search key (client safe) |
| `INNGEST_EVENT_KEY` | `lib/workflows` | Yes | Event ingestion key |
| `INNGEST_SIGNING_KEY` | `lib/workflows` | No | Webhook verification key |
| `OPENAI_API_KEY` | `lib/ai` | No | OpenAI API key |
| `ANTHROPIC_API_KEY` | `lib/ai` | No | Anthropic API key |
| `BLOB_READ_WRITE_TOKEN` | evidence uploads | No | Vercel Blob token |
