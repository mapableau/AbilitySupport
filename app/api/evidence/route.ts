/**
 * /api/evidence — Evidence reference CRUD.
 *
 * GET  ?entity_type=organisation|worker&entity_id=<uuid>
 *      — list evidence for an entity
 * POST — attach new evidence (provider upload or coordinator manual entry)
 *
 * Auth: x-user-id header (Clerk stub). Provider admins can attach to
 * their org/workers; coordinators can attach to any entity.
 */

import { z } from "zod";
import {
  createEvidenceRefSchema,
  EVIDENCE_ENTITY_TYPES,
} from "../../../lib/schemas/evidence.js";
import {
  listEvidenceForEntity,
  createEvidenceRef,
} from "../../../lib/evidence/data.js";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const entityType = url.searchParams.get("entity_type");
  const entityId = url.searchParams.get("entity_id");

  if (!entityType || !entityId) {
    return Response.json(
      { error: "Missing required query params: entity_type, entity_id" },
      { status: 400 },
    );
  }

  const validTypes: readonly string[] = EVIDENCE_ENTITY_TYPES;
  if (!validTypes.includes(entityType)) {
    return Response.json(
      { error: `entity_type must be one of: ${EVIDENCE_ENTITY_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(entityId)) {
    return Response.json({ error: "entity_id must be a valid UUID" }, { status: 400 });
  }

  const refs = await listEvidenceForEntity(entityType, entityId);
  return Response.json({ evidenceRefs: refs });
}

export async function POST(request: Request): Promise<Response> {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return Response.json(
      { error: "Unauthorized. Provide x-user-id header." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createEvidenceRefSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const ref = await createEvidenceRef(parsed.data, userId);

  return Response.json({ evidenceRef: ref }, { status: 201 });
}
