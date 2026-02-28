# MapAble (AbilitySupport)

AI-assisted support coordination platform for Care + Transport (NDIS).

## Cursor Cloud specific instructions

**Target stack:** Next.js App Router + TypeScript, Neon Postgres (PostGIS + pgvector), Typesense Cloud, Inngest, Clerk, Vercel AI SDK. See `ARCHITECTURE.md` for the full module map and dependency graph.

**Current state:** NestJS scaffold exists alongside the new `lib/` module tree. The NestJS scaffold (`src/`, `nest-cli.json`) will be removed once the Next.js app is stood up.

**Key commands** (all via `pnpm run <script>`, see `package.json` for full list):

| Task | Command |
|---|---|
| Dev server (watch mode) | `pnpm run start:dev` |
| Lint (with autofix) | `pnpm run lint` |
| Unit tests | `pnpm run test` |
| E2E tests | `pnpm run test:e2e` |
| Build | `pnpm run build` |
| Format | `pnpm run format` |

**Module structure:** All shared business logic lives in `lib/` with six modules: `db`, `schemas`, `risk`, `search`, `workflows`, `ai`. Each module has an `index.ts` barrel export. See `ARCHITECTURE.md` for boundaries and rules.

**Gotchas:**

- `pnpm.onlyBuiltDependencies` in `package.json` whitelists packages for postinstall scripts. If a new dependency requires build scripts, add it to that list rather than running `pnpm approve-builds` (which is interactive and blocks in CI/cloud).
- ESLint uses flat config (`eslint.config.mjs`). The lint script includes `--fix` by default.
- `lib/risk` is pure functions — no DB calls, no side effects. Keep it that way for testability.
- `lib/ai` tool `execute()` functions should be thin wrappers delegating to `lib/search`, `lib/risk`, or `lib/db`.
- `lib/workflows` functions must be idempotent (Inngest retries on failure).
