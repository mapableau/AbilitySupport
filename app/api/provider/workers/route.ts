/**
 * /api/provider/workers — Workers CRUD for provider admins.
 *
 * GET  — list all workers for the authenticated org
 * POST — create a new worker, emit worker/updated event
 *
 * Auth: requires x-organisation-id and x-user-id headers (Clerk stub).
 */

import { createWorkerSchema } from "../../../../lib/schemas/worker.js";
import {
  listWorkers,
  createWorker,
} from "../../../../lib/provider-pool/data.js";
import {
  getProviderAuth,
  unauthorizedResponse,
} from "../../../../lib/provider-pool/auth.js";
import { inngest } from "../../../../lib/workflows/inngest/client.js";

export async function GET(request: Request): Promise<Response> {
  const auth = await getProviderAuth(request);
  if (!auth) return unauthorizedResponse();

  const workers = await listWorkers(auth.organisationId);
  return Response.json({ workers });
}

export async function POST(request: Request): Promise<Response> {
  const auth = await getProviderAuth(request);
  if (!auth) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createWorkerSchema.safeParse({
    ...(body as Record<string, unknown>),
    organisationId: auth.organisationId,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const worker = await createWorker(auth.organisationId, parsed.data);

  await inngest.send({
    name: "worker/updated",
    data: { workerId: worker.id, organisationId: auth.organisationId },
  });

  return Response.json({ worker }, { status: 201 });
}
