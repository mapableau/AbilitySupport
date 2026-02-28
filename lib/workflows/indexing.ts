/**
 * lib/workflows/indexing.ts — Event-driven search indexing workflows.
 *
 * Inngest functions that rebuild Typesense documents when domain entities
 * change. Each function follows the pattern:
 *   1. Fetch the impacted entity + aggregates from Postgres
 *   2. Build a search document via the pure builder functions
 *   3. Upsert into Typesense
 *
 * All functions are idempotent — processing the same event twice produces
 * the same Typesense state. Inngest retries failed steps automatically.
 *
 * Logging: each step logs context so failures are diagnosable from the
 * Inngest dashboard without needing to cross-reference app logs.
 */

import { inngest } from "./inngest/client.js";
import {
  buildOrganisationDoc,
  type BuildOrgDocInput,
} from "../search/indexer/buildOrganisationDoc.js";
import {
  buildWorkerDoc,
  type BuildWorkerDocInput,
} from "../search/indexer/buildWorkerDoc.js";
import {
  upsertOrganisationDocs,
  upsertWorkerDocs,
} from "../search/indexer/upsert.js";
import type {
  OrganisationRow,
  OrgVehicleSummary,
  WorkerRowWithCapabilities,
} from "../search/indexer/types.js";

// ═══════════════════════════════════════════════════════════════════════════
// Data-fetching helpers (placeholder SQL — replace with real Drizzle queries
// once lib/db/schema.ts is updated to match 0001_core.sql)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch a single organisation row by ID.
 * TODO: replace with real Drizzle query once schema is updated.
 */
async function fetchOrganisationRow(
  _organisationId: string,
): Promise<OrganisationRow | null> {
  // const { db } = await import("../db/index.js");
  // const [row] = await db.select().from(organisations).where(eq(organisations.id, id));
  // return row ?? null;
  console.log(`[indexing] fetchOrganisationRow(${_organisationId}) — stub`);
  return null;
}

/** Fetch aggregated vehicle summary for an organisation. */
async function fetchOrgVehicleSummary(
  _organisationId: string,
): Promise<OrgVehicleSummary> {
  // const { db } = await import("../db/index.js");
  // Query: SELECT count(*), bool_or(wheelchair_accessible), array_agg(DISTINCT vehicle_type)
  //        FROM vehicles WHERE organisation_id = $1 AND active = true
  console.log(`[indexing] fetchOrgVehicleSummary(${_organisationId}) — stub`);
  return { total_vehicles: 0, wav_available: false, vehicle_types: [] };
}

/** Count active, clearance-current workers for an organisation. */
async function fetchActiveWorkerCount(
  _organisationId: string,
): Promise<number> {
  console.log(`[indexing] fetchActiveWorkerCount(${_organisationId}) — stub`);
  return 0;
}

/** Aggregate all capabilities across active workers for an organisation. */
async function fetchOrgWorkerCapabilities(
  _organisationId: string,
): Promise<string[]> {
  console.log(`[indexing] fetchOrgWorkerCapabilities(${_organisationId}) — stub`);
  return [];
}

/** Fetch a single worker row (joined with org) by worker ID. */
async function fetchWorkerRow(
  _workerId: string,
): Promise<WorkerRowWithCapabilities | null> {
  console.log(`[indexing] fetchWorkerRow(${_workerId}) — stub`);
  return null;
}

/** Fetch all worker rows for an organisation. */
async function fetchWorkersByOrg(
  _organisationId: string,
): Promise<WorkerRowWithCapabilities[]> {
  console.log(`[indexing] fetchWorkersByOrg(${_organisationId}) — stub`);
  return [];
}

/** Build service area tokens from an organisation's address. */
function buildOrgServiceAreaTokens(org: OrganisationRow): string[] {
  const tokens: string[] = [];
  if (org.suburb) tokens.push(org.suburb.toLowerCase());
  if (org.state) tokens.push(org.state.toUpperCase());
  if (org.postcode) tokens.push(org.postcode);
  if (org.suburb && org.state) tokens.push(`${org.suburb.toLowerCase()} ${org.state.toUpperCase()}`);
  return tokens;
}

/** Fetch all recently updated organisation IDs (last N hours). */
async function fetchRecentlyUpdatedOrgIds(
  _hoursAgo: number,
): Promise<string[]> {
  // const { db } = await import("../db/index.js");
  // SELECT id FROM organisations WHERE updated_at > now() - interval '$1 hours'
  console.log(`[indexing] fetchRecentlyUpdatedOrgIds(${_hoursAgo}h) — stub`);
  return [];
}

/** Fetch all recently updated worker IDs (last N hours). */
async function fetchRecentlyUpdatedWorkerIds(
  _hoursAgo: number,
): Promise<string[]> {
  console.log(`[indexing] fetchRecentlyUpdatedWorkerIds(${_hoursAgo}h) — stub`);
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared rebuild logic
// ═══════════════════════════════════════════════════════════════════════════

async function rebuildAndUpsertOrg(organisationId: string): Promise<{ indexed: boolean }> {
  const row = await fetchOrganisationRow(organisationId);
  if (!row) {
    console.log(`[indexing] Organisation ${organisationId} not found, skipping`);
    return { indexed: false };
  }

  const [vehicles, workerCount, workerCaps] = await Promise.all([
    fetchOrgVehicleSummary(organisationId),
    fetchActiveWorkerCount(organisationId),
    fetchOrgWorkerCapabilities(organisationId),
  ]);

  const input: BuildOrgDocInput = {
    row,
    activeWorkerCount: workerCount,
    vehicles,
    workerCapabilities: workerCaps,
  };

  const doc = buildOrganisationDoc(input);
  const result = await upsertOrganisationDocs([doc]);

  if (result.errors.length > 0) {
    console.error(`[indexing] Org ${organisationId} upsert errors:`, result.errors);
  }

  return { indexed: result.success > 0 };
}

async function rebuildAndUpsertWorker(
  workerId: string,
  orgRow: OrganisationRow | null,
): Promise<{ indexed: boolean }> {
  const workerRow = await fetchWorkerRow(workerId);
  if (!workerRow) {
    console.log(`[indexing] Worker ${workerId} not found, skipping`);
    return { indexed: false };
  }

  const org = orgRow ?? await fetchOrganisationRow(workerRow.organisation_id);

  const input: BuildWorkerDocInput = {
    row: workerRow,
    orgLocation: org && org.lat != null && org.lng != null
      ? { lat: org.lat, lng: org.lng }
      : null,
    orgServiceAreaTokens: org ? buildOrgServiceAreaTokens(org) : [],
  };

  const doc = buildWorkerDoc(input);
  const result = await upsertWorkerDocs([doc]);

  if (result.errors.length > 0) {
    console.error(`[indexing] Worker ${workerId} upsert errors:`, result.errors);
  }

  return { indexed: result.success > 0 };
}

// ═══════════════════════════════════════════════════════════════════════════
// Inngest functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * organisation/updated — Rebuild the org doc AND all its workers' docs
 * (because worker docs inherit org location and service area tokens).
 */
export const onOrganisationUpdated = inngest.createFunction(
  {
    id: "index-organisation-updated",
    name: "Index: Organisation Updated",
    retries: 3,
    concurrency: [{ limit: 5 }],
  },
  { event: "organisation/updated" },
  async ({ event, step, logger }) => {
    const { organisationId } = event.data;
    logger.info("Indexing organisation", { organisationId });

    const orgResult = await step.run("rebuild-org-doc", () =>
      rebuildAndUpsertOrg(organisationId),
    );

    const workerIds = await step.run("fetch-org-workers", () =>
      fetchWorkersByOrg(organisationId).then((ws) => ws.map((w) => w.id)),
    );

    let workersIndexed = 0;
    if (workerIds.length > 0) {
      const orgRow = await fetchOrganisationRow(organisationId);
      workersIndexed = await step.run("rebuild-worker-docs", async () => {
        let count = 0;
        for (const wid of workerIds) {
          const r = await rebuildAndUpsertWorker(wid, orgRow);
          if (r.indexed) count++;
        }
        return count;
      });
    }

    return {
      organisationId,
      orgIndexed: orgResult.indexed,
      workersIndexed,
    };
  },
);

/**
 * worker/updated — Rebuild the single worker doc.
 */
export const onWorkerUpdated = inngest.createFunction(
  {
    id: "index-worker-updated",
    name: "Index: Worker Updated",
    retries: 3,
    concurrency: [{ limit: 10 }],
  },
  { event: "worker/updated" },
  async ({ event, step, logger }) => {
    const { workerId, organisationId } = event.data;
    logger.info("Indexing worker", { workerId, organisationId });

    const result = await step.run("rebuild-worker-doc", () =>
      rebuildAndUpsertWorker(workerId, null),
    );

    const orgResult = await step.run("rebuild-org-doc", () =>
      rebuildAndUpsertOrg(organisationId),
    );

    return {
      workerId,
      workerIndexed: result.indexed,
      orgReindexed: orgResult.indexed,
    };
  },
);

/**
 * vehicle/updated — Rebuild the parent org doc (vehicle data is aggregated
 * into the org doc, not indexed separately).
 */
export const onVehicleUpdated = inngest.createFunction(
  {
    id: "index-vehicle-updated",
    name: "Index: Vehicle Updated",
    retries: 3,
    concurrency: [{ limit: 5 }],
  },
  { event: "vehicle/updated" },
  async ({ event, step, logger }) => {
    const { vehicleId, organisationId } = event.data;
    logger.info("Indexing vehicle change", { vehicleId, organisationId });

    const result = await step.run("rebuild-org-doc", () =>
      rebuildAndUpsertOrg(organisationId),
    );

    return { vehicleId, organisationId, orgIndexed: result.indexed };
  },
);

/**
 * availability/updated — Rebuild the impacted worker and/or org doc.
 * Availability data is not stored in Typesense directly, but changes
 * may affect worker active status or org aggregate signals.
 */
export const onAvailabilityUpdated = inngest.createFunction(
  {
    id: "index-availability-updated",
    name: "Index: Availability Updated",
    retries: 3,
    concurrency: [{ limit: 10 }],
  },
  { event: "availability/updated" },
  async ({ event, step, logger }) => {
    const { slotId, workerId, organisationId } = event.data;
    logger.info("Indexing availability change", { slotId, workerId, organisationId });

    let workerIndexed = false;
    if (workerId) {
      const result = await step.run("rebuild-worker-doc", () =>
        rebuildAndUpsertWorker(workerId, null),
      );
      workerIndexed = result.indexed;
    }

    const orgResult = await step.run("rebuild-org-doc", () =>
      rebuildAndUpsertOrg(organisationId),
    );

    return { slotId, workerIndexed, orgIndexed: orgResult.indexed };
  },
);

/**
 * Nightly delta reindex — re-index everything updated in the last 25 hours.
 * The 25h window (not 24h) provides 1 hour of overlap to handle clock skew
 * and long-running transactions.
 */
export const nightlyDeltaReindex = inngest.createFunction(
  {
    id: "nightly-delta-reindex",
    name: "Nightly Delta Reindex",
    retries: 2,
    concurrency: [{ limit: 1 }],
  },
  { cron: "0 3 * * *" },
  async ({ step, logger }) => {
    const HOURS_AGO = 25;
    logger.info(`Nightly delta reindex: last ${HOURS_AGO}h`);

    const orgIds = await step.run("fetch-updated-orgs", () =>
      fetchRecentlyUpdatedOrgIds(HOURS_AGO),
    );

    let orgsIndexed = 0;
    if (orgIds.length > 0) {
      orgsIndexed = await step.run("reindex-orgs", async () => {
        let count = 0;
        for (const id of orgIds) {
          const r = await rebuildAndUpsertOrg(id);
          if (r.indexed) count++;
        }
        return count;
      });
    }

    const workerIds = await step.run("fetch-updated-workers", () =>
      fetchRecentlyUpdatedWorkerIds(HOURS_AGO),
    );

    let workersIndexed = 0;
    if (workerIds.length > 0) {
      workersIndexed = await step.run("reindex-workers", async () => {
        let count = 0;
        for (const id of workerIds) {
          const r = await rebuildAndUpsertWorker(id, null);
          if (r.indexed) count++;
        }
        return count;
      });
    }

    const result = {
      orgsChecked: orgIds.length,
      orgsIndexed,
      workersChecked: workerIds.length,
      workersIndexed,
    };
    logger.info("Nightly reindex complete", result);
    return result;
  },
);

/**
 * search/reindex — Manual full or delta reindex triggered from admin UI.
 */
export const onSearchReindex = inngest.createFunction(
  {
    id: "search-reindex-manual",
    name: "Search: Manual Reindex",
    retries: 1,
    concurrency: [{ limit: 1 }],
  },
  { event: "search/reindex" },
  async ({ event, step, logger }) => {
    const { collection, mode } = event.data;
    const hoursAgo = mode === "delta" ? 25 : 24 * 365;
    logger.info("Manual reindex", { collection, mode });

    const results: Record<string, number> = {};

    if (collection === "organisations_search" || collection === "all") {
      const orgIds = await step.run("fetch-orgs", () =>
        fetchRecentlyUpdatedOrgIds(hoursAgo),
      );
      results.orgsIndexed = await step.run("reindex-orgs", async () => {
        let count = 0;
        for (const id of orgIds) {
          const r = await rebuildAndUpsertOrg(id);
          if (r.indexed) count++;
        }
        return count;
      });
    }

    if (collection === "workers_search" || collection === "all") {
      const workerIds = await step.run("fetch-workers", () =>
        fetchRecentlyUpdatedWorkerIds(hoursAgo),
      );
      results.workersIndexed = await step.run("reindex-workers", async () => {
        let count = 0;
        for (const id of workerIds) {
          const r = await rebuildAndUpsertWorker(id, null);
          if (r.indexed) count++;
        }
        return count;
      });
    }

    return results;
  },
);

/** All indexing functions — register in the Inngest serve() handler. */
export const indexingFunctions = [
  onOrganisationUpdated,
  onWorkerUpdated,
  onVehicleUpdated,
  onAvailabilityUpdated,
  nightlyDeltaReindex,
  onSearchReindex,
];
