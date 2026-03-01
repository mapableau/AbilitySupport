/**
 * POST /api/auth/webhook — Clerk webhook handler.
 *
 * Receives user.created and user.updated events from Clerk.
 * Syncs the user to the internal users table and assigns the
 * default role (participant) on first login.
 *
 * Webhook signature verification:
 *   In production, verify using CLERK_WEBHOOK_SECRET via svix.
 *   Currently stubbed — accepts all POST bodies.
 */

import {
  syncUserFromClerk,
} from "../../../../lib/auth/sync.js";

interface ClerkWebhookPayload {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
  };
}

export async function POST(request: Request): Promise<Response> {
  // TODO: verify webhook signature with svix
  // const svix = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  // const payload = svix.verify(body, headers);

  let payload: ClerkWebhookPayload;
  try {
    payload = (await request.json()) as ClerkWebhookPayload;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, data } = payload;

  if (type !== "user.created" && type !== "user.updated") {
    return Response.json({ ignored: true, type });
  }

  const email = data.email_addresses?.[0]?.email_address ?? "";
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || "Unknown";

  const { user, created } = await syncUserFromClerk({
    clerkId: data.id,
    email,
    fullName,
    avatarUrl: data.image_url,
  });

  return Response.json({
    success: true,
    userId: user.id,
    created,
    event: type,
  });
}
