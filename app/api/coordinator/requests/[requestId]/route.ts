/**
 * POST /api/coordinator/requests/[requestId] — Coordinator actions on a request.
 *
 * Body: { action: "approve" | "add_notes", notes?: string }
 *
 * approve    — moves status from awaiting_review → matching
 * add_notes  — appends coordinator notes to the request
 */

import { z } from "zod";
import {
  approveRequest,
  addRequestNotes,
} from "../../../../../lib/coordinator/data.js";
import {
  getCoordinatorAuth,
  unauthorizedResponse,
} from "../../../../../lib/coordinator/auth.js";

const actionSchema = z.object({
  action: z.enum(["approve", "add_notes"]),
  notes: z.string().max(5000).optional(),
});

interface RouteContext {
  params: Promise<{ requestId: string }>;
}

export async function POST(request: Request, ctx: RouteContext): Promise<Response> {
  const auth = await getCoordinatorAuth(request);
  if (!auth) return unauthorizedResponse();

  const { requestId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { action, notes } = parsed.data;

  if (action === "approve") {
    const ok = await approveRequest(requestId, auth.userId, notes);
    if (!ok) {
      return Response.json({ error: "Request not found or not reviewable" }, { status: 404 });
    }
    return Response.json({ success: true, action: "approved", requestId });
  }

  if (action === "add_notes") {
    if (!notes) {
      return Response.json({ error: "Notes are required for add_notes action" }, { status: 400 });
    }
    const ok = await addRequestNotes(requestId, auth.userId, notes);
    if (!ok) {
      return Response.json({ error: "Request not found" }, { status: 404 });
    }
    return Response.json({ success: true, action: "notes_added", requestId });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
