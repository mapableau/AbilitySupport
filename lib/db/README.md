# lib/db — Database Access Layer

Neon Postgres via **Drizzle ORM**, with three access patterns and an
audit log helper.

## Access Patterns

| Export | Transport | Use case |
|---|---|---|
| `db` | Neon HTTP | Typed Drizzle queries. Stateless, edge-compatible. |
| `query` | Neon HTTP | Raw SQL via tagged template (PostGIS, CTEs). |
| `withTransaction(fn)` | Neon WebSocket Pool | Interactive transactions (read-then-write). |
| `audit(entry)` | Neon HTTP | Fire-and-forget audit log writes. |

### Choosing the right pattern

- **`db`** — default for everything. Type-safe, composable, edge-compatible.
- **`query`** — when Drizzle's query builder doesn't support a feature (e.g. `ST_Distance`, raw CTEs, `EXPLAIN ANALYZE`). Parameters are auto-escaped.
- **`withTransaction()`** — when you need to read intermediate results inside a transaction to decide what to do next.
- **`audit()`** — write an immutable audit log entry. Non-blocking — never breaks user flows.

```ts
import { db, query, withTransaction, audit, users } from "@/lib/db";
import { eq } from "drizzle-orm";

// Typed query
const [user] = await db.select().from(users).where(eq(users.email, email));

// Raw SQL
const rows = await query`SELECT count(*) FROM users WHERE active = ${true}`;

// Interactive transaction
const result = await withTransaction(async (tx) => {
  const [u] = await tx.select().from(users).where(eq(users.id, id));
  if (!u) throw new Error("Not found");
  await tx.update(users).set({ active: false }).where(eq(users.id, id));
  return u;
});

// Audit log
await audit({
  userId: user.id,
  action: "update",
  entityType: "users",
  entityId: user.id,
  summary: "Deactivated user account",
});
```

## Core Tables (Drizzle schema)

| Table | File | Purpose |
|---|---|---|
| `users` | `schema.ts` | Clerk-synced identity (clerk_id → internal uuid) |
| `roles` | `schema.ts` | RBAC: admin, coordinator, participant, provider_admin, worker |
| `consents` | `schema.ts` | NDIS consent records with temporal validity |
| `audit_log` | `schema.ts` | Immutable append-only access/mutation log |

Additional tables (organisations, workers, bookings, etc.) are defined in
`db/migrations/0001_core.sql` and will be added to `schema.ts` as the
Drizzle migration path catches up.

## Migrations

MapAble uses two migration strategies side by side:

### 1. Hand-authored SQL migrations (`db/migrations/`)

For the full production schema. Applied manually or via a deploy script.

```
db/migrations/
├── 0001_core.sql           # 14 tables, PostGIS, 69 indexes, triggers
├── 0002_evidence_refs.sql  # Evidence references
└── 0003_audit_log.sql      # Immutable audit log
```

Apply with `psql` or any SQL runner:

```bash
psql $DATABASE_URL -f db/migrations/0001_core.sql
psql $DATABASE_URL -f db/migrations/0002_evidence_refs.sql
psql $DATABASE_URL -f db/migrations/0003_audit_log.sql
```

### 2. Drizzle Kit (`drizzle/`)

For iterating on `lib/db/schema.ts` during development. Drizzle Kit diffs
the schema file against a snapshot and generates incremental SQL.

```bash
pnpm db:generate   # Diff schema.ts → write SQL migration
pnpm db:migrate    # Apply pending Drizzle migrations
pnpm db:push       # Push schema directly (no migration files)
pnpm db:studio     # Open Drizzle Studio UI
```

### Which to use

- **New tables / complex DDL** → write in `db/migrations/` (hand-authored)
- **Column tweaks during dev** → edit `schema.ts` + `pnpm db:push`
- **Production deploys** → apply `db/migrations/` files in order

## File Layout

```
lib/db/
├── client.ts    # Neon HTTP + Drizzle singleton
├── query.ts     # Raw SQL tagged template helper
├── tx.ts        # WebSocket Pool + interactive transactions
├── audit.ts     # Audit log writer (fire-and-forget)
├── schema.ts    # Drizzle table definitions (users, roles, consents, audit_log)
├── index.ts     # Barrel export
└── README.md    # This file

db/migrations/   # Hand-authored SQL migrations (production schema)
drizzle/         # Drizzle Kit generated migrations (dev workflow)
drizzle.config.ts  # Drizzle Kit configuration
```

## Environment

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon pooled connection string |

Validated at import time by `lib/env.ts`.
