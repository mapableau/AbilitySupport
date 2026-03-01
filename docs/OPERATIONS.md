# Developer Discipline & Operating Procedures

> How we branch, review, release, deploy, and monitor MapAble.

## 1. Branching Strategy

We use **trunk-based development** with short-lived feature branches.

```
main (production)
  ├── staging         ← pre-release validation
  └── feature/*       ← developer work (merged via PR)
      task/*
      fix/*
      chore/*
```

### Branch naming

| Prefix | Purpose | Example |
|---|---|---|
| `feature/` | New functionality | `feature/consent-enforcement` |
| `fix/` | Bug fix | `fix/rls-policy-bookings` |
| `task/` | Non-feature work (docs, refactor, deps) | `task/update-drizzle-schema` |
| `chore/` | Infra, CI, tooling | `chore/add-eslint-rule` |
| `hotfix/` | Emergency production fix | `hotfix/booking-status-check` |

### Rules

1. Branch from `main`, PR back to `main`.
2. Keep branches short-lived (< 3 days). Break large features into stacked PRs.
3. `staging` is auto-deployed from `main` after merge — never push directly to `staging`.
4. Hotfixes branch from `main`, merge to `main`, cherry-pick to `staging` if needed.
5. Delete branches after merge. GitHub auto-deletes on PR merge (enable in repo settings).

### Branch protection

| Branch | Required checks | Approvals | Force push |
|---|---|---|---|
| `main` | CI pass (lint + test + build + tsc) | 1 | Blocked |
| `staging` | CI pass | 0 (auto-deploy) | Blocked |

---

## 2. Code Review Conventions

### PR requirements

- [ ] Title follows conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- [ ] Description explains **what** and **why**, not how (the code shows how)
- [ ] Links to relevant issue or task
- [ ] Self-reviewed before requesting review (re-read your own diff)
- [ ] No `console.log` debugging left in (use `logger` for intentional logging)
- [ ] New modules have an `index.ts` barrel export
- [ ] New API routes have input validation (Zod) and auth guards

### Review checklist (for the reviewer)

- [ ] Does the change match the PR description?
- [ ] Are Zod schemas used for all external input?
- [ ] Are auth guards in place (`getAuthContext`, `requireRole`, etc.)?
- [ ] Is consent checked before accessing participant data (`checkConsent`)?
- [ ] Are Inngest events emitted for state changes that affect search indexes?
- [ ] Are pure functions tested (no DB mocking needed)?
- [ ] Do new DB operations use `audit()` for sensitive reads/writes?
- [ ] Are RLS policies considered for new tables?
- [ ] Is `lib/env.ts` updated if new env vars are added?
- [ ] Is `ARCHITECTURE.md` or relevant `docs/` updated if boundaries change?

### Review etiquette

- Use **suggestions** (GitHub suggested changes) for small fixes.
- Prefix comments: `nit:` (style, optional), `question:` (clarification), `blocker:` (must fix).
- Approve with nits — don't block on style.
- Respond within one business day. If you can't, re-assign.

---

## 3. Release Checklist

### Pre-release (before merging to `main`)

- [ ] All CI checks pass (lint, test, build, tsc)
- [ ] Preview deploy tested on Vercel (link in PR)
- [ ] Database migration reviewed (`db/migrations/*.sql`)
  - [ ] No destructive operations without explicit approval
  - [ ] Indexes added for new FK columns and query patterns
  - [ ] RLS policies added for new tables
  - [ ] `updated_at` trigger added for new tables
- [ ] New env vars documented in `.env.example` and `docs/ENVIRONMENT.md`
- [ ] Zod schemas match any new/changed API contracts
- [ ] Consent requirements updated if new participant data is stored
- [ ] Evidence references updated if new provider claims are supported

### Post-merge (after landing on `main`)

- [ ] Vercel production deploy completes successfully
- [ ] Database migration applied (`psql` or deploy script)
- [ ] Inngest functions registered (check Inngest dashboard)
- [ ] Typesense collections synced (trigger `search/reindex` event if schema changed)
- [ ] Smoke test critical flows:
  - [ ] Login (Clerk redirect works)
  - [ ] Search returns results
  - [ ] Recommendation pipeline runs
  - [ ] Coordinator queue loads
- [ ] Monitor error rates for 30 minutes post-deploy

### Rollback

1. **Vercel**: instant rollback via Vercel dashboard → Deployments → select previous → Promote
2. **Database**: migrations are forward-only. For schema rollback, write and apply a compensating migration.
3. **Inngest**: functions are re-registered on each deploy. Previous function versions are archived automatically.
4. **Typesense**: trigger a full reindex (`search/reindex` event with `mode: "full"`) to rebuild from current DB state.

---

## 4. Deployment Steps

### Automated (standard)

Every push to `main` triggers the full pipeline:

```
git push origin main
  │
  ├── Vercel build
  │     next build (includes tsc)
  │     If build fails → deploy blocked, team notified
  │
  ├── Neon migration
  │     drizzle-kit migrate (or manual psql for hand-authored migrations)
  │
  ├── Vercel deploy
  │     Serverless functions + static assets deployed atomically
  │     Previous version kept as instant rollback target
  │
  ├── Inngest sync
  │     PUT /api/inngest registers all functions
  │     Cron schedules updated automatically
  │
  └── Post-deploy
        Vercel sends deployment webhook
        Monitor dashboards for error spike
```

### Manual (emergency hotfix)

```bash
# 1. Branch from main
git checkout -b hotfix/critical-issue main

# 2. Fix, test locally
pnpm test && pnpm lint && pnpm build

# 3. Push and create PR
git push -u origin hotfix/critical-issue
gh pr create --title "hotfix: description" --base main

# 4. Get emergency review (1 approval required)
# 5. Merge — auto-deploys to production

# 6. If DB migration needed:
psql $DATABASE_URL -f db/migrations/NNNN_hotfix.sql
```

### Database migration (hand-authored)

For migrations in `db/migrations/` (not Drizzle Kit):

```bash
# Review the SQL first
cat db/migrations/0006_calendar_events.sql

# Apply to production
psql $DATABASE_URL -f db/migrations/0006_calendar_events.sql

# Verify
psql $DATABASE_URL -c "SELECT count(*) FROM calendar_events;"
```

---

## 5. Monitoring & Alerting

### Service health

| Service | Monitor | Alert threshold |
|---|---|---|
| **Vercel** | Vercel Analytics + Speed Insights | P95 latency > 3s, error rate > 1% |
| **Neon Postgres** | Neon dashboard metrics | Connection pool exhaustion, query latency > 500ms |
| **Typesense** | Typesense Cloud dashboard | Search latency > 200ms, index lag > 5 min |
| **Inngest** | Inngest dashboard | Function failure rate > 5%, queue depth growing |
| **Clerk** | Clerk dashboard | Auth error rate > 0.5%, webhook delivery failures |

### What to monitor

**Application level:**
- API route error rates (5xx) — Vercel Logs
- Auth failures (401/403 spikes) — indicates broken session or RBAC issue
- Consent denials (403 CONSENT_REQUIRED) — indicates missing consent prompts
- Recommendation pipeline latency — Inngest function duration
- Search reindex lag — time since last successful nightly reindex

**Infrastructure level:**
- Neon connection count — should stay well below pool limit
- Vercel cold start frequency — edge functions should be warm
- Inngest retry rate — high retries indicate flaky dependencies
- Clerk webhook delivery — failures mean user sync is lagging

### Alerting channels

| Severity | Channel | Response time |
|---|---|---|
| Critical (service down) | PagerDuty / SMS | 15 minutes |
| High (degraded functionality) | Slack `#mapable-alerts` | 1 hour |
| Medium (elevated errors) | Slack `#mapable-alerts` | Same business day |
| Low (warning threshold) | Slack `#mapable-monitoring` | Next standup |

### Runbooks

For each alert, the team should have a runbook in the team wiki covering:
1. What the alert means
2. Impact to users
3. Diagnostic steps (which dashboard, which logs)
4. Resolution steps
5. Escalation path if unresolved in 30 minutes

### Key runbook scenarios

| Scenario | First step |
|---|---|
| Auth failures spiking | Check Clerk status page → check webhook logs → verify CLERK_SECRET_KEY |
| Search returning stale data | Check Inngest dashboard for reindex failures → trigger manual `search/reindex` |
| Recommendation pipeline failing | Check Typesense connectivity → check Neon connectivity → review Inngest function logs |
| RLS blocking legitimate queries | Check `app.current_user_id` / `app.current_role` are set correctly → review RLS policy for the failing table |
| Consent denials in production | Check if new API route is missing `checkConsent()` call → check if consent prompt UI is deployed |

---

## 6. Development Workflow Quick Reference

```
1. Pick a task
2. git checkout -b feature/my-task main
3. Implement (follow module boundary rules in ARCHITECTURE.md)
4. pnpm test && pnpm lint && pnpm build
5. git push -u origin feature/my-task
6. Create PR (conventional commit title)
7. Review + CI pass
8. Merge to main → auto-deploy
9. Verify in production (smoke test)
10. Delete branch
```
