/**
 * lib/db/audit.ts — Convenience helper for writing audit log entries.
 *
 * Wraps INSERT INTO audit_log with typed parameters.
 * Fire-and-forget by default — audit failures are logged but do not
 * block the request.
 */

import { db } from "./client.js";
import { auditLog } from "./schema.js";

export interface AuditEntry {
  userId?: string;
  clerkId?: string;
  ipAddress?: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  diff?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit log entry. Non-blocking — catches and logs errors
 * rather than throwing, so audit failures never break user flows.
 *
 * ```ts
 * import { audit } from "@/lib/db";
 *
 * await audit({
 *   userId: auth.userId,
 *   action: "update",
 *   entityType: "participant_profiles",
 *   entityId: profileId,
 *   summary: "Updated participant address",
 *   diff: { before: { suburb: "Old" }, after: { suburb: "New" } },
 * });
 * ```
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLog).values({
      userId: entry.userId,
      clerkId: entry.clerkId,
      ipAddress: entry.ipAddress,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      diff: entry.diff,
      metadata: entry.metadata,
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log entry:", err);
  }
}
