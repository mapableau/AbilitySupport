# Consent & Privacy Design

> How MapAble protects NDIS participant data.

See [ARCHITECTURE.md](../ARCHITECTURE.md) § 4 for the summary.

## Consent Types

| Type | What it grants | Typical grantor |
|---|---|---|
| `data_sharing` | Share profile with matched providers | Participant or guardian |
| `service_agreement` | Enter bookings with a specific org | Participant |
| `plan_management` | View plan budget + line items | Plan manager |
| `transport` | Share location data for transport matching | Participant |
| `medical_info` | Disclose health notes to assigned worker | Participant or guardian |

## Consent Lifecycle

```
Consent created (granted_by, granted_at)
  → Active (no expires_at or expires_at > now())
  → Expired (expires_at < now())
  → Revoked (revoked_at set)
```

Before any participant data is returned, the API checks:
1. Does an active consent of the required type exist?
2. Was it granted by the participant or an authorised guardian?
3. Has it not been revoked?

## Row-Level Security (RLS)

**Status: Implemented** — see `db/migrations/0004_rls_policies.sql`.

Two layers of access control work together:
- **App layer** — `lib/auth` session guards (401/403 before query runs)
- **Database layer** — Postgres RLS policies (blocks query even if app has a bug)

### How it works

The app sets session variables via `withRlsContext()` at the start of each
request, inside a transaction:

```ts
import { withRlsContext, buildRlsContext } from "@/lib/db";

const rows = await withRlsContext(
  buildRlsContext(auth),
  async (tx) => tx.select().from(participant_profiles),
);
```

This calls the `set_rls_context()` Postgres function:

```sql
SELECT set_rls_context('user-uuid'::uuid, 'coordinator', NULL::uuid);
```

RLS policies read these via `rls_user_id()`, `rls_role()`, `rls_org_id()`.

### Policy summary

| Table | Participant | Worker | Provider Admin | Coordinator/Admin/Auditor |
|---|---|---|---|---|
| users | Own row | Own row | Own row | All |
| participant_profiles | Own (user_id) | — | — | All |
| consents | Own profile | — | — | All |
| workers | — | Own row (user_id) | Own org | All |
| vehicles | — | — | Own org | All |
| availability_slots | — | Own slots | Own org | All |
| bookings | Own profile | Assigned | Own org | All |
| followups | Created by self | Via booking | — | All |
| organisations | Read all | Read all | Write own | All |
| recommendations | — | — | Own org (read) | All |
| evidence_refs | — | — | Own org entities | All |
| audit_log | — | — | — | Admin + Auditor only |

## Data Classification

| Level | Examples | Storage | Access |
|---|---|---|---|
| Public | Org name, service types, suburb | Postgres + Typesense | Anyone |
| Internal | Worker capabilities, vehicle types | Postgres + Typesense | Authenticated users |
| Confidential | Participant name, NDIS number, plan dates | Postgres only | Consent-gated |
| Sensitive | Medical notes, incident reports | Postgres only | Consent-gated + role check |
