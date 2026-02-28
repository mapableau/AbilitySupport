# MapAble — Architecture

> AI-assisted support coordination for Care + Transport (NDIS).

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router (TypeScript) |
| Database | Neon Postgres (PostGIS + pgvector) |
| ORM | Drizzle ORM |
| Search | Typesense Cloud |
| Workflows | Inngest |
| Auth | Clerk |
| AI | Vercel AI SDK (OpenAI) |
| Hosting | Vercel |

## Module Map (`lib/`)

```
lib/
├── env.ts           # Zod-validated environment variables (crashes on bad config)
│
├── db/              # Database access layer
│   ├── client.ts    # Neon + Drizzle client singleton
│   ├── schema.ts    # Drizzle table definitions (PostGIS, pgvector)
│   └── index.ts     # Barrel export
│
├── schemas/         # Zod validation schemas (shared server + client)
│   ├── common.ts    # Reusable atoms: coordinates, address, pagination
│   ├── participant.ts
│   ├── provider.ts
│   ├── booking.ts
│   └── index.ts
│
├── risk/            # Participant risk scoring (pure domain logic)
│   ├── flags.ts     # Risk flag definitions + severity weights
│   ├── scorer.ts    # Pure function: data in → scored result out
│   └── index.ts
│
├── search/          # Typesense Cloud integration
│   ├── client.ts    # Typesense client singleton
│   ├── collections.ts  # Collection schema definitions
│   ├── indexer.ts   # Bulk upsert + delta sync helpers
│   └── index.ts
│
├── workflows/       # Inngest background workflows
│   ├── client.ts    # Inngest client singleton
│   ├── events.ts    # Typed event map (domain/verb format)
│   ├── functions/   # One file per step function
│   │   ├── reindex-providers.ts
│   │   └── index.ts
│   └── index.ts
│
└── ai/              # Chat orchestration (Vercel AI SDK)
    ├── prompts.ts   # System prompts + template functions
    ├── tools.ts     # AI tool definitions (searchProviders, risk, bookings)
    ├── orchestrator.ts  # streamText composition (consumed by API route)
    └── index.ts
```

## Module Boundaries

The dependency graph flows **downward** — upper layers may import from lower
layers, but never the reverse.

```
   ┌──────────┐
   │  app/    │   Next.js routes, pages, server actions
   └────┬─────┘
        │ imports
   ┌────▼─────┐
   │  lib/ai  │   Orchestrator + tools (thin wrappers)
   └────┬─────┘
        │ delegates to
   ┌────▼──────────────────────────┐
   │  lib/risk   lib/search       │   Domain logic + search
   └────┬──────────┬───────────────┘
        │          │
   ┌────▼──────────▼───┐
   │     lib/db         │   Data access (Drizzle + Neon)
   └────────────────────┘

   lib/env      ← imported by every module that reads process.env
   lib/schemas  ← imported at every layer for validation + type inference
   lib/workflows ← triggered by app/ routes, calls into db/search/risk via steps
```

### Rules

1. **`lib/db`** owns all SQL. No raw queries outside this module.
2. **`lib/schemas`** is the single source of truth for input validation shapes.
   Drizzle `schema.ts` defines the DB shape; Zod schemas define the API shape.
   They are deliberately separate — the DB schema may have columns the API never
   exposes, and the API may accept computed fields the DB doesn't store.
3. **`lib/risk`** is pure functions — no DB calls, no side effects. The caller
   fetches data and passes it in. This keeps the scorer trivially unit-testable.
4. **`lib/search`** never writes to the DB. It is a read-from-DB, write-to-Typesense
   pipeline. Indexing is orchestrated by `lib/workflows`.
5. **`lib/workflows`** functions must be idempotent. Inngest retries on failure,
   so every step must be safe to re-run.
6. **`lib/ai`** tool `execute()` functions are thin wrappers — they delegate to
   `lib/search`, `lib/risk`, or `lib/db` for the real work.
7. **`app/`** routes are responsible for auth (Clerk), input validation (Zod),
   and HTTP concerns. Business logic lives in `lib/`.
8. **`lib/env`** is the only place that reads `process.env`. All other modules
   import `env` from `@/lib/env` and use the validated, typed object.

## Indexing Strategy

Typesense is kept in sync via two mechanisms:

| Trigger | Strategy | Frequency |
|---|---|---|
| Inngest cron (`search/reindex`) | Full reindex | Nightly 03:00 UTC |
| Domain events (`provider/updated`, `booking/created`) | Delta upsert | Real-time |

## Environment Variables

| Variable | Module | Description |
|---|---|---|
| `DATABASE_URL` | `lib/db` | Neon pooled connection string |
| `TYPESENSE_HOST` | `lib/search` | Typesense Cloud host |
| `TYPESENSE_API_KEY` | `lib/search` | Admin API key (server only) |
| `TYPESENSE_SEARCH_KEY` | `lib/search` | Scoped search key (client safe) |
| `INNGEST_EVENT_KEY` | `lib/workflows` | Event ingestion key |
| `INNGEST_SIGNING_KEY` | `lib/workflows` | Webhook signature key |
| `OPENAI_API_KEY` | `lib/ai` | OpenAI API key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `app/` | Clerk frontend key |
| `CLERK_SECRET_KEY` | `app/` | Clerk backend key |
