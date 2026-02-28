/**
 * /api/provider/workers/[workerId] — Single worker CRUD.
 *
 * GET    — fetch worker detail
 * PUT    — update worker (capabilities, drives, clearance, vehicle link)
 * DELETE — soft-delete (set active = false)
 *
 * All mutations emit worker/updated and organisation/updated events
 * so Typesense is kept in sync.
 */

import { updateWorkerSchema } from "../../../../../lib/schemas/worker.js";
import {
  getWorker,
  updateWorker,
  deleteWorker,
} from "../../../../../lib/provider-pool/data.js";
import {
  getProviderAuth,
  unauthorizedResponse,
} from "../../../../../lib/provider-pool/auth.js";
import { inngest } from "../../../../../lib/workflows/inngest/client.js";

interface RouteContext {
  params: Promise<{ workerId: string }>;
}

export async function GET(request: Request, ctx: RouteContext): Promise<Response> {
  const auth = await getProviderAuth(request);
  if (!auth) return unauthorizedResponse();

  const { workerId } = await ctx.params;
  const worker = await getWorker(workerId, auth.organisationId);

  if (!worker) {
    return Response.json({ error: "Worker not found" }, { status: 404 });
  }

  return Response.json({ worker });
}

export async function PUT(request: Request, ctx: RouteContext): Promise<Response> {
  const auth = await getProviderAuth(request);
  if (!auth) return unauthorizedResponse();

  const { workerId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateWorkerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const worker = await updateWorker(workerId, auth.organisationId, parsed.data);
  if (!worker) {
    return Response.json({ error: "Worker not found" }, { status: 404 });
  }

  await inngest.send([
    {
      name: "worker/updated",
      data: { workerId, organisationId: auth.organisationId },
    },
    {
      name: "organisation/updated",
      data: { organisationId: auth.organisationId },
    },
  ]);

  return Response.json({ worker });
}

export async function DELETE(request: Request, ctx: RouteContext): Promise<Response> {
  const auth = await getProviderAuth(request);
  if (!auth) return unauthorizedResponse();

  const { workerId } = await ctx.params;
  const deleted = await deleteWorker(workerId, auth.organisationId);

  if (!deleted) {
    return Response.json({ error: "Worker not found" }, { status: 404 });
  }

  await inngest.send([
    {
      name: "worker/updated",
      data: { workerId, organisationId: auth.organisationId },
    },
    {
      name: "organisation/updated",
      data: { organisationId: auth.organisationId },
    },
  ]);

  return Response.json({ success: true });
}
