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

## RLS Implementation Plan

Phase 1 (current): App-layer checks in route handlers and data access functions.

Phase 2 (planned): Postgres RLS policies as defence-in-depth. The app sets
session variables at the start of each request:

```sql
SET LOCAL app.user_id = '<uuid>';
SET LOCAL app.org_id = '<uuid>';
SET LOCAL app.role = 'coordinator';
```

Policies reference these variables. Even if app code has a bug, Postgres
blocks the query.

## Data Classification

| Level | Examples | Storage | Access |
|---|---|---|---|
| Public | Org name, service types, suburb | Postgres + Typesense | Anyone |
| Internal | Worker capabilities, vehicle types | Postgres + Typesense | Authenticated users |
| Confidential | Participant name, NDIS number, plan dates | Postgres only | Consent-gated |
| Sensitive | Medical notes, incident reports | Postgres only | Consent-gated + role check |
