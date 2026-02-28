/**
 * /coordinator/queue — Coordinator review queue.
 *
 * Shows two sections:
 *   1. "Human Required" — coordination requests awaiting human review
 *      (status = awaiting_review, from risk policy requiresHumanReview)
 *   2. "Needs Verification" — recommendations the system couldn't fully
 *      verify (confidence = needs_verification)
 *
 * Actions: approve, request verification, add notes.
 * Minimal server-rendered UI — will be enhanced with client components.
 */

import {
  URGENCY_LEVELS,
  COORDINATION_STATUSES,
  CONFIDENCE_LEVELS,
} from "../../../lib/schemas/enums.js";

const URGENCY_COLORS: Record<string, string> = {
  emergency: "#dc2626",
  urgent: "#ea580c",
  standard: "#2563eb",
  low: "#6b7280",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  verified: "#16a34a",
  likely: "#ca8a04",
  needs_verification: "#dc2626",
};

export default function CoordinatorQueuePage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Coordinator Review Queue</h1>
        <p style={{ color: "#666", marginTop: 4 }}>
          Items requiring your attention. Approve, verify, or add notes before they proceed.
        </p>
      </header>

      {/* ── Human Required ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
            Human Required
          </h2>
          <span style={{
            background: "#fef2f2",
            color: "#dc2626",
            fontSize: 12,
            fontWeight: 700,
            padding: "2px 10px",
            borderRadius: 99,
            border: "1px solid #fecaca",
          }}>
            Requires coordinator approval
          </span>
        </div>
        <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
          Coordination requests flagged by the risk policy engine. These cannot
          proceed to matching without your explicit approval.
        </p>

        <div style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Participant</th>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Type</th>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Urgency</th>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Reason</th>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Created</th>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Placeholder row — populated by client-side fetch to /api/coordinator/queue */}
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#999" }}>
                  No requests awaiting review. The queue is clear.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend for urgency colors */}
        <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12, color: "#666" }}>
          {URGENCY_LEVELS.map((u) => (
            <span key={u} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: URGENCY_COLORS[u] ?? "#999",
              }} />
              {u}
            </span>
          ))}
        </div>
      </section>

      {/* ── Needs Verification ─────────────────────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
            Needs Verification
          </h2>
          <span style={{
            background: "#fffbeb",
            color: "#ca8a04",
            fontSize: 12,
            fontWeight: 700,
            padding: "2px 10px",
            borderRadius: 99,
            border: "1px solid #fde68a",
          }}>
            Coordinator should verify before accepting
          </span>
        </div>
        <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
          Recommendations with unknowns the system couldn&apos;t resolve automatically.
          Call the provider, check availability, or confirm details before accepting.
        </p>

        <div style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Organisation</th>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Worker</th>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Score</th>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Confidence</th>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Unknowns</th>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Placeholder row — populated by client-side fetch */}
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#999" }}>
                  No recommendations needing verification.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Confidence legend */}
        <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12, color: "#666" }}>
          {CONFIDENCE_LEVELS.map((c) => (
            <span key={c} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: CONFIDENCE_COLORS[c] ?? "#999",
              }} />
              {c.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </section>

      {/* ── API Reference ──────────────────────────────────────────────── */}
      <footer style={{
        marginTop: 32,
        padding: 16,
        background: "#f9fafb",
        borderRadius: 8,
        fontSize: 13,
        color: "#666",
      }}>
        <strong>API endpoints:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>GET /api/coordinator/queue — Fetch queue items (human_review + needs_verification)</li>
          <li>POST /api/coordinator/requests/[id] — Approve request or add notes</li>
          <li>POST /api/coordinator/recommendations/[id] — Approve, reject, request verification, or add notes</li>
        </ul>
        <div style={{ marginTop: 12 }}>
          <strong>Queue entry criteria:</strong>
          <ul style={{ marginTop: 4, paddingLeft: 20 }}>
            <li><strong>Human Required:</strong> coordination_requests where risk policy set requiresHumanReview = true, status = awaiting_review</li>
            <li><strong>Needs Verification:</strong> recommendations where confidence = needs_verification and status = pending</li>
          </ul>
        </div>
        <div style={{ marginTop: 12 }}>
          <strong>Valid coordination statuses:</strong>{" "}
          {COORDINATION_STATUSES.join(", ")}
        </div>
      </footer>
    </div>
  );
}
