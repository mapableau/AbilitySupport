/**
 * lib/recommendations/pipeline.ts — Full recommendation pipeline.
 *
 * Orchestrates: load request → search Typesense → verify Postgres
 * → score → group → persist → return.
 *
 * The pipeline is a pure async function that takes a request_id and
 * returns GroupedRecommendations. It can be called from the API route
 * or from an Inngest step function.
 */

import type { MatchSpec } from "../schemas/match-spec.js";
import { matchSpecSchema } from "../schemas/match-spec.js";
import { searchOrganisations, searchWorkers } from "./search.js";
import { verifyAllCandidates } from "./verify.js";
import { scoreOrgCandidate, rankRecommendations } from "./score.js";
import type {
  CoordinationRequestRow,
  LoadedRequest,
  ScoredRecommendation,
  GroupedRecommendations,
} from "./types.js";

const TOP_N = 20;

// ── Data access (stub — wire to real Drizzle queries) ──────────────────────

async function loadCoordinationRequest(
  requestId: string,
): Promise<CoordinationRequestRow | null> {
  // TODO: replace with real query
  // const { db } = await import("../db/index.js");
  // const [row] = await db.select().from(coordination_requests)
  //   .where(eq(coordination_requests.id, requestId));
  // return row ?? null;
  console.log(`[pipeline] loadCoordinationRequest(${requestId}) — stub`);
  return null;
}

async function persistRecommendations(
  _requestId: string,
  _recs: ScoredRecommendation[],
): Promise<void> {
  // TODO: INSERT INTO recommendations (coordination_request_id, organisation_id, ...)
  // Idempotent: DELETE existing recommendations for this request first, then INSERT
  // await db.delete(recommendations).where(eq(recommendations.coordinationRequestId, requestId));
  // await db.insert(recommendations).values(recs.map(r => ({ ... })));
  console.log(`[pipeline] persistRecommendations — ${_recs.length} rows (stub)`);
}

// ── Match spec reconstruction ──────────────────────────────────────────────

function buildMatchSpecFromRow(row: CoordinationRequestRow): MatchSpec {
  const raw: Record<string, unknown> = {
    participantProfileId: row.participant_profile_id,
    requestType: row.request_type,
    serviceTypes: row.service_type ? [row.service_type] : [],
    urgency: row.urgency,
    maxDistanceKm: 25,
  };

  if (row.location_lat != null && row.location_lng != null) {
    raw.location = { lat: row.location_lat, lng: row.location_lng };
  }
  if (row.destination_lat != null && row.destination_lng != null) {
    raw.destination = { lat: row.destination_lat, lng: row.destination_lng };
  }
  if (row.preferred_start) raw.preferredStart = row.preferred_start;
  if (row.preferred_end) raw.preferredEnd = row.preferred_end;

  return matchSpecSchema.parse(raw);
}

// ── Grouping logic ─────────────────────────────────────────────────────────

/**
 * Group recommendations into combined vs split.
 *
 * Combined: the org handles both care and transport (org_type = "both",
 * or a care org with a worker who can drive).
 *
 * Split: separate care and transport orgs. For "care" or "transport"-only
 * requests, all results go into the relevant split bucket and combined
 * is empty.
 */
function groupRecommendations(
  requestType: string,
  scored: ScoredRecommendation[],
  orgDocs: Map<string, { orgType: string; canDrive: boolean }>,
): GroupedRecommendations["combined" | "split"] extends never ? never
  : { combined: ScoredRecommendation[]; split: { care: ScoredRecommendation[]; transport: ScoredRecommendation[] } } {
  if (requestType !== "both") {
    const bucket = requestType === "transport" ? "transport" : "care";
    return {
      combined: [],
      split: {
        care: bucket === "care" ? scored : [],
        transport: bucket === "transport" ? scored : [],
      },
    };
  }

  const combined: ScoredRecommendation[] = [];
  const careOnly: ScoredRecommendation[] = [];
  const transportOnly: ScoredRecommendation[] = [];

  for (const rec of scored) {
    const orgInfo = orgDocs.get(rec.organisationId);
    const isBothOrg = orgInfo?.orgType === "both";
    const careOrgThatDrives = orgInfo?.orgType === "care" && orgInfo.canDrive;

    if (isBothOrg || careOrgThatDrives) {
      combined.push(rec);
    } else if (orgInfo?.orgType === "transport") {
      transportOnly.push(rec);
    } else {
      careOnly.push(rec);
    }
  }

  return {
    combined: rankRecommendations(combined),
    split: {
      care: rankRecommendations(careOnly),
      transport: rankRecommendations(transportOnly),
    },
  };
}

// ── Pipeline ───────────────────────────────────────────────────────────────

export async function runRecommendationPipeline(
  requestId: string,
): Promise<GroupedRecommendations> {
  // 1. Load coordination request
  const row = await loadCoordinationRequest(requestId);
  if (!row) {
    throw new PipelineError("NOT_FOUND", `Coordination request ${requestId} not found`);
  }
  if (row.status === "cancelled" || row.status === "completed") {
    throw new PipelineError("INVALID_STATUS", `Request ${requestId} is ${row.status}`);
  }

  const matchSpec = buildMatchSpecFromRow(row);

  // 2. Search Typesense for candidates
  const [orgCandidates, workerCandidates] = await Promise.all([
    searchOrganisations(matchSpec),
    searchWorkers(matchSpec),
  ]);

  const totalSearched = orgCandidates.length + workerCandidates.length;

  // 3. Take top N orgs and verify hard constraints in Postgres
  const topOrgs = orgCandidates.slice(0, TOP_N);
  const verified = await verifyAllCandidates(topOrgs, workerCandidates, matchSpec);

  // Filter out orgs that fail pool constraints
  const eligible = verified.filter((v) => v.verification.orgPoolAllowed);

  // 4. Score and rank
  const scored = eligible.map((v) => scoreOrgCandidate(v, matchSpec));
  const ranked = rankRecommendations(scored);

  // 5. Build org metadata for grouping
  const orgDocs = new Map<string, { orgType: string; canDrive: boolean }>();
  for (const v of verified) {
    const hasDriverWorker = v.workers.some((w) => w.doc.can_drive);
    orgDocs.set(v.doc.entity_id, {
      orgType: v.doc.org_type,
      canDrive: hasDriverWorker,
    });
  }

  // 6. Group into combined vs split
  const { combined, split } = groupRecommendations(
    matchSpec.requestType,
    ranked,
    orgDocs,
  );

  // 7. Persist recommendation rows (idempotent — deletes then inserts)
  const allRecs = [...combined, ...split.care, ...split.transport];
  await persistRecommendations(requestId, allRecs);

  return {
    requestId,
    requestType: matchSpec.requestType,
    combined,
    split,
    meta: {
      totalCandidatesSearched: totalSearched,
      totalVerified: eligible.length,
      totalReturned: allRecs.length,
      generatedAt: new Date().toISOString(),
    },
  };
}

// ── Error class ────────────────────────────────────────────────────────────

export class PipelineError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "INVALID_STATUS" | "SEARCH_FAILED" | "VERIFY_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "PipelineError";
  }
}
