# MapAble

AI-assisted support coordination platform for Care + Transport (NDIS).

MapAble connects NDIS participants with care and transport providers through
intelligent matching, risk-aware recommendations, and event-driven workflows.

## Tech Stack

Next.js 15 (App Router) · TypeScript · Neon Postgres (PostGIS + pgvector) ·
Drizzle ORM · Typesense Cloud · Inngest · Clerk · Vercel AI SDK · Vercel

## Quick Start

### Prerequisites

- Node.js 22+ (managed via nvm)
- pnpm 10+
- A Neon Postgres database (free tier works)
- Typesense Cloud account (or local Docker instance)
- Clerk application (free dev instance)
- Inngest account (free dev tier)

### 1. Clone and install

```bash
git clone https://github.com/mapableau/AbilitySupport.git
cd AbilitySupport
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in the required values in `.env.local`. See `.env.example` for
descriptions. The app validates all env vars at startup via `lib/env.ts` and
will crash with a clear error listing any missing variables.

### 3. Set up the database

```bash
# Apply migrations to your Neon database
pnpm db:migrate

# Or for rapid prototyping (no migration files):
pnpm db:push
```

### 4. Run the dev server

```bash
pnpm start:dev
```

The NestJS scaffold runs on `http://localhost:3000`. This will be replaced
with `next dev` once the Next.js conversion is complete.

### 5. Run tests

```bash
pnpm test          # Unit tests (Jest)
pnpm test:e2e      # E2E tests
pnpm lint          # ESLint with autofix
```

## Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `pnpm start:dev` | `nest start --watch` | Dev server with hot reload |
| `pnpm build` | `nest build` | Production build |
| `pnpm test` | `jest` | Run unit tests |
| `pnpm lint` | `eslint --fix` | Lint with autofix |
| `pnpm format` | `prettier --write` | Format code |
| `pnpm db:generate` | `drizzle-kit generate` | Generate migration SQL from schema diff |
| `pnpm db:migrate` | `drizzle-kit migrate` | Apply pending migrations |
| `pnpm db:push` | `drizzle-kit push` | Push schema directly (no migration files) |
| `pnpm db:studio` | `drizzle-kit studio` | Open Drizzle Studio UI |

## Project Structure

```
app/                    # Next.js App Router (pages + API routes)
  api/                  # API route handlers
    coordinator/        # Coordinator review queue APIs
    provider/           # Provider pool management APIs
    recommendations/    # Recommendation pipeline API
    evidence/           # Evidence reference CRUD
    followups/          # Post-service followup responses
    inngest/            # Inngest webhook handler
  coordinator/          # Coordinator UI pages
  provider/             # Provider admin UI pages

lib/                    # Shared business logic (12 modules)
  auth/                 # Clerk integration + role-based auth
  db/                   # Neon Postgres + Drizzle ORM
  schemas/              # Zod validation schemas + shared enums
  risk/                 # Deterministic risk policy engine
  search/               # Typesense search + indexing
  recommendations/      # Match → verify → score → hydrate pipeline
  coordinator/          # Coordinator queue data access
  provider-pool/        # Provider admin CRUD
  evidence/             # Evidence reference management
  followups/            # Post-service signal analysis + escalation
  workflows/            # Inngest event-driven workflows
  ai/                   # Vercel AI SDK orchestration

db/migrations/          # Hand-authored SQL migrations
  0001_core.sql         # Core schema (14 tables, PostGIS, 69 indexes)
  0002_evidence_refs.sql  # Evidence references

docs/                   # Architecture and design documents
```

See `ARCHITECTURE.md` for the full module map, dependency graph,
authentication spine, federation design, consent/RLS structure,
and deployment strategy.

## Day 1–3 Acceptance Criteria

### Day 1 — Foundation

- [x] Repository initialised with folder structure
- [x] Neon Postgres connection layer (`lib/db`) with Drizzle ORM
- [x] Zod env validation (`lib/env.ts`) crashes on missing vars
- [x] Core SQL migration (`0001_core.sql`) with 14 tables + PostGIS
- [x] Zod schemas for all domain entities with shared `as const` enums
- [x] ARCHITECTURE.md documenting modules, auth, federation, consent, deployment
- [x] TypeScript compiles, ESLint passes, Jest runs

### Day 2 — Search + Matching

- [x] Typesense collection schemas (organisations_search, workers_search)
- [x] Document builders (org + worker → Typesense docs)
- [x] Inngest integration with event-driven indexing (6 workflows)
- [x] Deterministic risk policy engine with 20 unit tests
- [x] Recommendation pipeline: search → verify → score → hydrate
- [x] `GET /api/recommendations` returns hydrated RecommendationCard DTOs

### Day 3 — Provider Pool + Coordinator Queue

- [x] Provider pool CRUD: workers, availability slots, incoming requests
- [x] All provider mutations emit Inngest events for Typesense sync
- [x] Coordinator review queue: Human Required + Needs Verification
- [x] Coordinator actions: approve, reject, request verification, add notes
- [x] Post-service followup workflow: booking.completed → check-in → signal analysis
- [x] Negative-signal escalation: create incident, lower provider confidence
- [x] Evidence reference module: attach proof to orgs/workers
- [x] Centralised auth spine (`lib/auth`) with typed context resolvers

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for:
- Authentication spine + Clerk integration
- Federation design (Disapedia OIDC + AccessiBooks SAML)
- Organisation skeleton + verification workflow
- Consent / privacy / RLS structure
- Deployment strategy (Vercel + Neon branching)
- Module boundary rules
- Environment variable reference
