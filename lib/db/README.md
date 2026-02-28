# lib/db — Database Access Layer

Neon Postgres via **Drizzle ORM**, with two connection modes.

## Connection Modes

| Export | Transport | Use case |
|---|---|---|
| `db` | Neon HTTP | Default for queries. Stateless, edge-compatible. |
| `withTransaction(fn)` | Neon WebSocket Pool | Interactive transactions that read then write. |

### When to use which

Use `db` for everything unless you need to **read intermediate results
inside a transaction** to decide what to do next. The HTTP driver sends each
Drizzle call as a single stateless request — fast and cheap, but it cannot
hold a Postgres transaction open across multiple round-trips.

`withTransaction()` opens a WebSocket to Neon and gives you a real
interactive transaction. The callback receives a Drizzle `tx` handle that
commits on success and rolls back on throw.

```ts
import { db, withTransaction, participants } from "@/lib/db";
import { eq } from "drizzle-orm";

// Simple query — uses HTTP, no transaction
const all = await db.select().from(participants);

// Interactive transaction — uses WebSocket Pool
const result = await withTransaction(async (tx) => {
  const [p] = await tx
    .select()
    .from(participants)
    .where(eq(participants.id, someId));

  if (!p.active) throw new Error("Participant is inactive");

  await tx
    .update(participants)
    .set({ active: false })
    .where(eq(participants.id, someId));

  return p;
});
```

## Migrations (Drizzle Kit)

We use **Drizzle Kit** for schema migrations. The workflow:

### 1. Edit the schema

Modify column/table definitions in `lib/db/schema.ts`.

### 2. Generate a migration

```bash
pnpm db:generate
```

This diffs `schema.ts` against the previous snapshot and writes a SQL
migration file into the `drizzle/` directory at the project root.

### 3. Review the generated SQL

Always inspect the migration before applying. Drizzle Kit generates
readable, standard SQL — check for destructive operations (DROP COLUMN,
ALTER TYPE, etc.) before proceeding.

### 4. Apply the migration

```bash
# Against your Neon branch / dev database:
pnpm db:migrate

# Or, for rapid prototyping without versioned migration files:
pnpm db:push
```

`db:migrate` applies pending migration files in order (recommended for
production). `db:push` syncs the schema directly without generating files
(convenient during early development, not recommended for production).

### 5. Inspect the database

```bash
pnpm db:studio
```

Opens Drizzle Studio (web UI) connected to your database for browsing
tables and data.

## Scripts Reference

| Script | Command | Purpose |
|---|---|---|
| `pnpm db:generate` | `drizzle-kit generate` | Generate migration SQL from schema diff |
| `pnpm db:migrate` | `drizzle-kit migrate` | Apply pending migrations |
| `pnpm db:push` | `drizzle-kit push` | Push schema directly (no migration files) |
| `pnpm db:studio` | `drizzle-kit studio` | Open Drizzle Studio UI |

## File Layout

```
lib/db/
├── client.ts    # Neon HTTP + Drizzle singleton (default)
├── tx.ts        # WebSocket Pool + interactive transaction helper
├── schema.ts    # Drizzle table definitions (source of truth)
├── index.ts     # Barrel export
└── README.md    # This file

drizzle/         # Generated migration files (committed to git)
drizzle.config.ts  # Drizzle Kit configuration (project root)
```

## Environment

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon pooled connection string (`postgresql://...?sslmode=require`) |

Set in `.env.local` for development. Validated at import time by `lib/env.ts`.

## PostGIS & pgvector

Both extensions must be enabled on the Neon database:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
```

Custom Drizzle column types for `geometry` and `vector` will be added to a
`lib/db/columns.ts` file when spatial and embedding queries are implemented.
