/**
 * /api/evidence/[evidenceId] — Single evidence ref operations.
 *
 * GET    — fetch evidence detail
 * PUT    — update evidence (title, url, snippet, verified status)
 * DELETE — soft-delete (set active = false)
 *
 * POST /api/evidence/[evidenceId]/verify — mark as verified (coordinator only)
 */

import { updateEvidenceRefSchema } from "../../../../lib/schemas/evidence.js";
import {
  getEvidenceRef,
  updateEvidenceRef,
  deleteEvidenceRef,
  verifyEvidenceRef,
} from "../../../../lib/evidence/data.js";

interface RouteContext {
  params: Promise<{ evidenceId: string }>;
}

export async function GET(_request: Request, ctx: RouteContext): Promise<Response> {
  const { evidenceId } = await ctx.params;
  const ref = await getEvidenceRef(evidenceId);
  if (!ref) {
    return Response.json({ error: "Evidence not found" }, { status: 404 });
  }
  return Response.json({ evidenceRef: ref });
}

export async function PUT(request: Request, ctx: RouteContext): Promise<Response> {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { evidenceId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateEvidenceRefSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const verifiedBy = parsed.data.verified ? userId : undefined;
  const ref = await updateEvidenceRef(evidenceId, parsed.data, verifiedBy);
  if (!ref) {
    return Response.json({ error: "Evidence not found" }, { status: 404 });
  }

  return Response.json({ evidenceRef: ref });
}

export async function DELETE(request: Request, ctx: RouteContext): Promise<Response> {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { evidenceId } = await ctx.params;
  const ok = await deleteEvidenceRef(evidenceId);
  if (!ok) {
    return Response.json({ error: "Evidence not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}

export async function POST(request: Request, ctx: RouteContext): Promise<Response> {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { evidenceId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const action = (body as Record<string, unknown>)?.action;

  if (action === "verify") {
    const ok = await verifyEvidenceRef(evidenceId, userId);
    if (!ok) {
      return Response.json({ error: "Evidence not found" }, { status: 404 });
    }
    return Response.json({ success: true, action: "verified", evidenceId });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
