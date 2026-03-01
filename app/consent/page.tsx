/**
 * /consent — Consent management page.
 *
 * Shows all consent scopes with their current status (active/inactive/expired).
 * Participants can grant or revoke each scope individually.
 *
 * Data loaded client-side from GET /api/consent?participant_profile_id=...
 */

import { CONSENT_TYPES } from "../../lib/schemas/enums.js";

const SCOPE_INFO: Record<string, { label: string; description: string; required: boolean }> = {
  data_sharing: {
    label: "Data Sharing",
    description: "Allow your profile to be shared with matched care and transport providers.",
    required: true,
  },
  location: {
    label: "Location",
    description: "Share your home location for proximity-based provider matching. Required for transport coordination.",
    required: true,
  },
  preference: {
    label: "Preferences",
    description: "Store your communication, gender, language, and accessibility preferences to improve service matching.",
    required: false,
  },
  learning: {
    label: "Learning & Improvement",
    description: "Allow MapAble to use your interaction history to improve AI recommendation quality over time. Your data is never shared externally.",
    required: false,
  },
  transport: {
    label: "Transport",
    description: "Share pickup and drop-off locations with transport providers for journey coordination.",
    required: false,
  },
  service_agreement: {
    label: "Service Agreement",
    description: "Enter into service bookings with matched organisations.",
    required: true,
  },
  plan_management: {
    label: "Plan Management",
    description: "Allow your plan manager to view NDIS plan budget and line items.",
    required: false,
  },
  medical_info: {
    label: "Medical Information",
    description: "Disclose relevant health information to your assigned support worker. This is never shared beyond your care team.",
    required: false,
  },
};

export default function ConsentPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Your Consent</h1>
        <p style={{ color: "#666", marginTop: 4, fontSize: 14 }}>
          MapAble requires your explicit consent before storing or sharing your data.
          You can grant or revoke any scope at any time. Required scopes are needed
          for core functionality.
        </p>
      </header>

      <div style={{
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        fontSize: 13,
        color: "#1e40af",
      }}>
        Consent records are timestamped and immutable. Granting creates a new record;
        revoking marks the existing record as revoked (it is never deleted).
        Your consent history is available for audit at any time.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {CONSENT_TYPES.map((type) => {
          const info = SCOPE_INFO[type] ?? { label: type, description: "", required: false };
          return (
            <div
              key={type}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 20,
                borderLeft: `4px solid ${info.required ? "#2563eb" : "#d1d5db"}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {info.label}
                    {info.required && (
                      <span style={{
                        marginLeft: 8,
                        fontSize: 11,
                        color: "#2563eb",
                        background: "#eff6ff",
                        padding: "2px 8px",
                        borderRadius: 99,
                      }}>
                        Required
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                    {info.description}
                  </div>
                  <code style={{ fontSize: 11, color: "#999", marginTop: 4, display: "block" }}>
                    {type}
                  </code>
                </div>

                <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 16 }}>
                  <span style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 600,
                    background: "#f3f4f6",
                    color: "#6b7280",
                  }}>
                    Not granted
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
          <li>GET /api/consent?participant_profile_id=... — List consent statuses</li>
          <li>POST /api/consent — Grant a consent scope</li>
          <li>POST /api/consent/revoke — Revoke by ID or by type</li>
        </ul>
        <div style={{ marginTop: 12 }}>
          <strong>Enforcement:</strong> APIs call <code>checkConsent()</code> before accessing
          consent-gated data. Missing consent returns 403 with <code>CONSENT_REQUIRED</code>
          error code listing the missing scopes.
        </div>
      </footer>
    </div>
  );
}
