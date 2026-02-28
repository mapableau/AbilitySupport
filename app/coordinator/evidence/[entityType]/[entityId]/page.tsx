/**
 * /coordinator/evidence/[entityType]/[entityId]
 *
 * Coordinator view: evidence references attached to an organisation or worker.
 * Shows existing evidence, allows adding manual evidence, and marking
 * items as verified.
 *
 * entityType: "organisation" | "worker"
 * entityId: UUID of the target entity
 */

import {
  EVIDENCE_CATEGORIES,
  EVIDENCE_SOURCES,
} from "../../../../../lib/schemas/evidence.js";

interface PageProps {
  params: Promise<{ entityType: string; entityId: string }>;
}

export default async function CoordinatorEvidencePage({ params }: PageProps) {
  const { entityType, entityId } = await params;
  const label = entityType === "organisation" ? "Organisation" : "Worker";

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <header style={{ marginBottom: 32 }}>
        <nav style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
          <a href="/coordinator/queue" style={{ color: "#2563eb" }}>Queue</a>
          {" → "}
          Evidence
        </nav>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>
          {label} Evidence
        </h1>
        <p style={{ color: "#666", marginTop: 4 }}>
          Evidence references for {entityType}{" "}
          <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>
            {entityId}
          </code>
        </p>
      </header>

      {/* ── Existing Evidence ──────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Evidence on File
        </h2>
        <div style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Title</th>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Category</th>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Source</th>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>URL / Snippet</th>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Verified</th>
                <th style={{ padding: "10px 12px", fontSize: 13 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#999" }}>
                  No evidence on file. Use the form below to add evidence.
                  <br />
                  <span style={{ fontSize: 12 }}>
                    Data loaded via GET /api/evidence?entity_type={entityType}&amp;entity_id={entityId}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Add Evidence Form ──────────────────────────────────────────── */}
      <section style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 24,
        marginBottom: 32,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Add Evidence
        </h2>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
          Attach a URL, document reference, or manual note as evidence for this {entityType}.
          Do not paste scraped content — only store what the provider has shared or
          what you have directly observed.
        </p>

        <form>
          <input type="hidden" name="entityType" value={entityType} />
          <input type="hidden" name="entityId" value={entityId} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                Title *
              </span>
              <input
                name="title"
                required
                placeholder="e.g. NDIS Worker Screening Check"
                style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6, boxSizing: "border-box" }}
              />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                Category *
              </span>
              <select
                name="category"
                required
                style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }}
              >
                {EVIDENCE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              URL (document link, website, or Vercel Blob URL)
            </span>
            <input
              name="url"
              type="url"
              placeholder="https://..."
              style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6, boxSizing: "border-box" }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              Snippet / Notes
            </span>
            <textarea
              name="snippet"
              rows={3}
              placeholder="Paste relevant excerpt or add coordinator notes..."
              style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6, resize: "vertical", boxSizing: "border-box" }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                Source
              </span>
              <select
                name="source"
                style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }}
              >
                {EVIDENCE_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                Captured At
              </span>
              <input
                name="capturedAt"
                type="datetime-local"
                style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6, boxSizing: "border-box" }}
              />
            </label>
          </div>

          <button
            type="submit"
            style={{
              background: "#2563eb",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Add Evidence
          </button>
        </form>
      </section>

      {/* ── API Reference ──────────────────────────────────────────────── */}
      <footer style={{
        padding: 16,
        background: "#f9fafb",
        borderRadius: 8,
        fontSize: 13,
        color: "#666",
      }}>
        <strong>API endpoints:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>GET /api/evidence?entity_type=...&amp;entity_id=... — List evidence</li>
          <li>POST /api/evidence — Attach new evidence</li>
          <li>GET /api/evidence/[id] — Fetch single evidence ref</li>
          <li>PUT /api/evidence/[id] — Update evidence</li>
          <li>POST /api/evidence/[id] {`{action:"verify"}`} — Mark verified</li>
          <li>DELETE /api/evidence/[id] — Soft-delete evidence</li>
        </ul>
      </footer>
    </div>
  );
}
