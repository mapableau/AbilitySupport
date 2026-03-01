/**
 * /profile/identities — Linked SSO identities page.
 *
 * Shows which external identity providers are linked to the user's
 * MapAble account (Disapedia OIDC, AccessiBooks SAML, or none).
 * Users can see when each link was created and last used.
 *
 * Data from: GET /api/auth/me (for current user)
 * SSO links would come from a future GET /api/auth/sso-links endpoint.
 */

export default function LinkedIdentitiesPage() {
  const providers = [
    {
      id: "disapedia",
      name: "Disapedia",
      protocol: "OpenID Connect",
      description: "Disability community identity platform. Log in with your Disapedia account.",
      icon: "🌐",
      color: "#2563eb",
      status: "not_linked" as const,
    },
    {
      id: "accessibooks",
      name: "AccessiBooks",
      protocol: "SAML 2.0",
      description: "Plan management platform. Coordinators and plan managers authenticate via their org.",
      icon: "📊",
      color: "#7c3aed",
      status: "not_linked" as const,
    },
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <header style={{ marginBottom: 32 }}>
        <nav style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
          <a href="/profile" style={{ color: "#2563eb" }}>Profile</a>
          {" → "}
          Linked Identities
        </nav>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Linked Identities</h1>
        <p style={{ color: "#666", marginTop: 4, fontSize: 14 }}>
          External identity providers linked to your MapAble account.
          Linking an identity lets you log in via SSO without a separate password.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        {providers.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 24,
              borderLeft: `4px solid ${p.color}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                {p.icon} {p.name}
              </div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                {p.description}
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#999" }}>
                <span>Protocol: {p.protocol}</span>
                <span>Provider: <code>{p.id}</code></span>
              </div>
            </div>

            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 24 }}>
              <span style={{
                display: "inline-block",
                padding: "6px 16px",
                borderRadius: 99,
                fontSize: 13,
                fontWeight: 600,
                background: "#f3f4f6",
                color: "#6b7280",
              }}>
                Not linked
              </span>
              <div style={{ marginTop: 8 }}>
                <button
                  style={{
                    background: p.color,
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Link {p.name}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 24,
        marginBottom: 32,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>How SSO linking works</h2>
        <ol style={{ fontSize: 13, color: "#666", lineHeight: 2, paddingLeft: 20, margin: 0 }}>
          <li>Click &quot;Link&quot; next to a provider</li>
          <li>You are redirected to the provider&apos;s login page</li>
          <li>After authenticating, the provider sends your identity back to MapAble via Clerk</li>
          <li>A record is created in the <code>sso_links</code> table linking your external ID to your MapAble user</li>
          <li>Future logins via that provider automatically sign you into MapAble</li>
        </ol>
      </section>

      <footer style={{ padding: 16, background: "#f9fafb", borderRadius: 8, fontSize: 13, color: "#666" }}>
        <strong>Data stored in <code>sso_links</code>:</strong> provider, external_id, email,
        display_name, organisation_id (AccessiBooks), provider_role, linked_at, last_login_at.
        <br />
        See <code>db/migrations/0005_sso_links.sql</code> for the full schema.
      </footer>
    </div>
  );
}
