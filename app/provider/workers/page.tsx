/**
 * /provider/workers — Worker management page for provider admins.
 *
 * Lists all workers in the organisation with capabilities, clearance
 * status, and links to edit/add workers and manage availability.
 *
 * This is a minimal server-rendered UI. The real implementation will
 * use Clerk auth for org context and client components for interactivity.
 */

import {
  WORKER_ROLES,
  WORKER_CAPABILITIES,
  CLEARANCE_STATUSES,
} from "../../../lib/schemas/enums.js";

export default function ProviderWorkersPage() {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Worker Management</h1>
        <p style={{ color: "#666", marginTop: 4 }}>
          Add, edit, and manage your support workers and their availability.
        </p>
      </header>

      {/* Add Worker Form */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 24, marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Add Worker</h2>
        <form method="POST" action="/api/provider/workers">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Full Name</span>
              <input
                name="fullName"
                required
                style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }}
              />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Role</span>
              <select
                name="workerRole"
                style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }}
              >
                {WORKER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              Capabilities (hold Ctrl/Cmd to select multiple)
            </span>
            <select
              name="capabilities"
              multiple
              size={4}
              style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }}
            >
              {WORKER_CAPABILITIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              Clearance Status
            </span>
            <select
              name="clearanceStatus"
              style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }}
            >
              {CLEARANCE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

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
            Add Worker
          </button>
        </form>
      </section>

      {/* Workers List Placeholder */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Current Workers</h2>
        <p style={{ color: "#999" }}>
          Workers will appear here once the database is connected.
          Each row shows name, role, capabilities (badges), clearance status,
          and links to manage availability slots.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Role</th>
              <th style={{ padding: 8 }}>Capabilities</th>
              <th style={{ padding: 8 }}>Clearance</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#999" }}>
                No workers yet. Use the form above to add one.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* API Reference */}
      <footer style={{ marginTop: 32, padding: 16, background: "#f9fafb", borderRadius: 8, fontSize: 13, color: "#666" }}>
        <strong>API endpoints:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>GET /api/provider/workers — List workers</li>
          <li>POST /api/provider/workers — Create worker</li>
          <li>PUT /api/provider/workers/[id] — Update worker</li>
          <li>DELETE /api/provider/workers/[id] — Deactivate worker</li>
          <li>GET /api/provider/workers/[id]/availability — List slots</li>
          <li>POST /api/provider/workers/[id]/availability — Add slot</li>
          <li>PUT /api/provider/workers/[id]/availability/[slotId] — Update slot</li>
          <li>DELETE /api/provider/workers/[id]/availability/[slotId] — Remove slot</li>
        </ul>
      </footer>
    </div>
  );
}
