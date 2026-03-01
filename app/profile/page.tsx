/**
 * /profile — Current user profile page.
 *
 * Shows the user's identity, assigned roles, consent scopes, and
 * quick links to role-specific features.
 *
 * Data is loaded client-side from GET /api/auth/me.
 * In production, this page is protected by Clerk middleware.
 */

import { USER_ROLES, CONSENT_TYPES } from "../../lib/schemas/enums.js";

const ROLE_LABELS: Record<string, { label: string; color: string; description: string }> = {
  admin: { label: "Admin", color: "#dc2626", description: "Full platform access" },
  auditor: { label: "Auditor", color: "#7c3aed", description: "Audit logs and compliance reports" },
  coordinator: { label: "Coordinator", color: "#2563eb", description: "Manage participants, review queue, approve matches" },
  participant: { label: "Participant", color: "#16a34a", description: "NDIS participant — view own data, submit feedback" },
  provider_admin: { label: "Provider Admin", color: "#ea580c", description: "Manage workers, vehicles, availability for an organisation" },
  worker: { label: "Worker", color: "#0891b2", description: "Support worker — view assigned shifts" },
};

export default function ProfilePage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>My Profile</h1>
        <p style={{ color: "#666", marginTop: 4, fontSize: 14 }}>
          Your identity, roles, and consent scopes. Data loaded from{" "}
          <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>
            GET /api/auth/me
          </code>
        </p>
      </header>

      {/* ── Roles ────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Roles</h2>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
          Default role on first login: <strong>participant</strong>.
          Additional roles are assigned by coordinators or admins.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {USER_ROLES.map((role) => {
            const info = ROLE_LABELS[role] ?? { label: role, color: "#666", description: "" };
            return (
              <div
                key={role}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 16,
                  borderLeft: `4px solid ${info.color}`,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{info.label}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{info.description}</div>
                <code style={{ fontSize: 11, color: "#999", marginTop: 4, display: "block" }}>
                  {role}
                </code>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Consent Scopes ───────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Consent Scopes</h2>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
          Active consent records. Data is only shared with providers when
          the relevant consent is granted and not expired/revoked.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "8px 12px", fontSize: 13 }}>Scope</th>
              <th style={{ padding: "8px 12px", fontSize: 13 }}>What it grants</th>
              <th style={{ padding: "8px 12px", fontSize: 13 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {CONSENT_TYPES.map((ct) => (
              <tr key={ct} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 12px", fontSize: 13 }}>
                  <code>{ct}</code>
                </td>
                <td style={{ padding: "8px 12px", fontSize: 13, color: "#666" }}>
                  {ct.replace(/_/g, " ")}
                </td>
                <td style={{ padding: "8px 12px", fontSize: 13, color: "#999" }}>
                  —
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Session Guard Reference ──────────────────────────────────── */}
      <section style={{
        padding: 16,
        background: "#f9fafb",
        borderRadius: 8,
        fontSize: 13,
        color: "#666",
      }}>
        <strong>Auth API endpoints:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li><code>GET /api/auth/me</code> — current user + roles + consent scopes</li>
          <li><code>POST /api/auth/webhook</code> — Clerk webhook (user.created / user.updated)</li>
        </ul>
        <div style={{ marginTop: 12 }}>
          <strong>Session guards (lib/auth):</strong>
          <ul style={{ marginTop: 4, paddingLeft: 20 }}>
            <li><code>getAuthContext()</code> — any authenticated user</li>
            <li><code>getOrgScopedAuth()</code> — provider_admin scoped to an org</li>
            <li><code>getCoordinatorAuth()</code> — coordinator or admin</li>
            <li><code>requireRole(request, ...roles)</code> — returns 401/403 or AuthContext</li>
          </ul>
        </div>
      </section>

      <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "#999" }}>
        <a href="/login" style={{ color: "#2563eb" }}>Login</a>
        {" · "}
        <a href="/coordinator/queue" style={{ color: "#2563eb" }}>Coordinator Queue</a>
        {" · "}
        <a href="/provider/workers" style={{ color: "#2563eb" }}>Provider Pool</a>
      </div>
    </div>
  );
}
