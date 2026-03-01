/**
 * /audit — Audit log viewer (admin + auditor only).
 *
 * Shows the immutable audit trail of data access and mutations.
 * Protected by RBAC: only admin and auditor roles can view.
 * RLS policy on audit_log table enforces this at the DB level too.
 */

const MOCK_ENTRIES = [
  { id: "1", time: "2026-03-01 09:15:22", user: "Sarah Coordinator", action: "consent_granted", entity: "consents", summary: "Granted location consent for Alice Johnson", ip: "203.0.113.42" },
  { id: "2", time: "2026-03-01 09:18:04", user: "System", action: "role_assigned", entity: "roles", summary: "Assigned participant role to new user Bob Reviewer (via Disapedia SSO)", ip: "—" },
  { id: "3", time: "2026-03-01 09:22:31", user: "Sarah Coordinator", action: "read", entity: "participant_profiles", summary: "Viewed profile for Alice Johnson", ip: "203.0.113.42" },
  { id: "4", time: "2026-03-01 09:30:15", user: "Sarah Coordinator", action: "create", entity: "coordination_requests", summary: "Created care request for Alice Johnson (personal_care, urgent)", ip: "203.0.113.42" },
  { id: "5", time: "2026-03-01 09:45:00", user: "System", action: "update", entity: "recommendations", summary: "Generated 5 recommendations for request req-001", ip: "—" },
  { id: "6", time: "2026-03-01 10:02:18", user: "Sarah Coordinator", action: "update", entity: "recommendations", summary: "Accepted recommendation #1 (Acme Care — Jane Smith)", ip: "203.0.113.42" },
  { id: "7", time: "2026-03-01 10:05:44", user: "Mike Provider", action: "update", entity: "workers", summary: "Updated worker Jane Smith capabilities: added driving", ip: "198.51.100.7" },
  { id: "8", time: "2026-03-01 14:30:00", user: "System", action: "escalation", entity: "followups", summary: "Escalation: negative feedback + accessibility mismatch for booking bk-042", ip: "—" },
  { id: "9", time: "2026-03-01 15:10:33", user: "Alice Johnson", action: "consent_revoked", entity: "consents", summary: "Revoked medical_info consent", ip: "192.0.2.88" },
  { id: "10", time: "2026-03-01 16:00:00", user: "System", action: "export", entity: "audit_log", summary: "Nightly audit log export for compliance team", ip: "—" },
];

const ACTION_COLORS: Record<string, string> = {
  create: "#16a34a",
  read: "#2563eb",
  update: "#ca8a04",
  delete: "#dc2626",
  login: "#6366f1",
  logout: "#6b7280",
  consent_granted: "#0891b2",
  consent_revoked: "#ea580c",
  role_assigned: "#7c3aed",
  role_removed: "#9333ea",
  export: "#0d9488",
  escalation: "#dc2626",
};

export default function AuditPage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Audit Log</h1>
          <span style={{
            background: "#fef2f2",
            color: "#dc2626",
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 10px",
            borderRadius: 99,
            border: "1px solid #fecaca",
          }}>
            Admin + Auditor only
          </span>
        </div>
        <p style={{ color: "#666", fontSize: 14 }}>
          Immutable record of every data access and mutation. Rows cannot be edited or deleted.
          Protected by RLS — only admin and auditor roles can view.
        </p>
      </header>

      <div style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 24,
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "10px 12px" }}>Time</th>
              <th style={{ padding: "10px 12px" }}>User</th>
              <th style={{ padding: "10px 12px" }}>Action</th>
              <th style={{ padding: "10px 12px" }}>Entity</th>
              <th style={{ padding: "10px 12px" }}>Summary</th>
              <th style={{ padding: "10px 12px" }}>IP</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ENTRIES.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: "#999", fontSize: 12 }}>
                  {entry.time}
                </td>
                <td style={{ padding: "8px 12px", fontWeight: 500 }}>{entry.user}</td>
                <td style={{ padding: "8px 12px" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "white",
                    background: ACTION_COLORS[entry.action] ?? "#6b7280",
                  }}>
                    {entry.action}
                  </span>
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <code style={{ fontSize: 11, background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>
                    {entry.entity}
                  </code>
                </td>
                <td style={{ padding: "8px 12px", color: "#444" }}>{entry.summary}</td>
                <td style={{ padding: "8px 12px", color: "#999", fontSize: 12, fontFamily: "monospace" }}>
                  {entry.ip}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action type legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {Object.entries(ACTION_COLORS).map(([action, color]) => (
          <span key={action} style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: "#666",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
            {action}
          </span>
        ))}
      </div>

      <footer style={{ padding: 16, background: "#f9fafb", borderRadius: 8, fontSize: 13, color: "#666" }}>
        <strong>Security:</strong> Audit log rows are immutable — a Postgres trigger prevents
        UPDATE and DELETE. RLS restricts reads to admin + auditor roles.
        The <code>audit()</code> helper in <code>lib/db</code> writes entries in a fire-and-forget
        pattern so logging never blocks user flows.
        <br /><br />
        <strong>Schema:</strong> <code>db/migrations/0003_audit_log.sql</code> — columns: user_id,
        clerk_id, ip_address, action (12 types), entity_type, entity_id, summary, diff (JSONB),
        metadata (JSONB), created_at. No updated_at (immutable).
      </footer>
    </div>
  );
}
