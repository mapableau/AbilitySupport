# AbilitySupport

An agentic support coordination platform built with NestJS.

## Cursor Cloud specific instructions

**Stack:** NestJS 11 (TypeScript), pnpm, Jest, ESLint (flat config), Prettier.

**Key commands** (all via `pnpm run <script>`, see `package.json` for full list):

| Task | Command |
|---|---|
| Dev server (watch mode) | `pnpm run start:dev` |
| Lint (with autofix) | `pnpm run lint` |
| Unit tests | `pnpm run test` |
| E2E tests | `pnpm run test:e2e` |
| Build | `pnpm run build` |
| Format | `pnpm run format` |

**Dev server** listens on port **3000** by default (`src/main.ts`).

**Gotchas:**

- `pnpm.onlyBuiltDependencies` in `package.json` whitelists `@nestjs/core` and `unrs-resolver` for postinstall scripts. If a new dependency requires build scripts, add it to that list rather than running `pnpm approve-builds` (which is interactive and blocks in CI/cloud).
- ESLint uses flat config (`eslint.config.mjs`). The lint script includes `--fix` by default.
- `pnpm run lint` produces a warning for `@typescript-eslint/no-floating-promises` in `src/main.ts`; this is expected from the NestJS scaffold and not a build blocker.
