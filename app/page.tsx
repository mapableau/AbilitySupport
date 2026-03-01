/**
 * app/page.tsx — Home / dashboard page.
 */

export default function HomePage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 48, textAlign: "center" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>MapAble</h1>
      <p style={{ color: "#666", fontSize: 16, marginBottom: 40 }}>
        AI-assisted support coordination for Care + Transport
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "left" }}>
        {[
          { href: "/login", title: "Login", desc: "Sign in with Clerk or SSO", color: "#2563eb" },
          { href: "/profile", title: "Profile", desc: "Your identity and roles", color: "#16a34a" },
          { href: "/profile/identities", title: "Linked Identities", desc: "Disapedia + AccessiBooks SSO", color: "#7c3aed" },
          { href: "/consent", title: "Consent", desc: "Manage data sharing scopes", color: "#ea580c" },
          { href: "/calendar", title: "Calendar", desc: "Availability + bookings", color: "#0891b2" },
          { href: "/coordinator/queue", title: "Review Queue", desc: "Coordinator approvals", color: "#dc2626" },
          { href: "/audit", title: "Audit Log", desc: "Access and mutation history", color: "#854d0e" },
          { href: "/provider/workers", title: "Workers", desc: "Provider pool management", color: "#0d9488" },
          { href: "/coordinator/evidence/organisation/demo", title: "Evidence", desc: "Provider verification", color: "#6366f1" },
        ].map((card) => (
          <a
            key={card.href}
            href={card.href}
            style={{
              display: "block",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 20,
              textDecoration: "none",
              color: "inherit",
              borderLeft: `4px solid ${card.color}`,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 15 }}>{card.title}</div>
            <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{card.desc}</div>
          </a>
        ))}
      </div>

      <div style={{ marginTop: 40, fontSize: 12, color: "#999" }}>
        Demo mode — auth via <code>x-user-id</code> headers.
        See <a href="https://github.com/mapableau/AbilitySupport" style={{ color: "#2563eb" }}>README</a> for setup.
      </div>
    </div>
  );
}
