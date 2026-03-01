/**
 * app/layout.tsx — Root layout with navigation shell.
 *
 * Provides a shared nav bar across all pages. In production this would
 * be wrapped in <ClerkProvider> for auth context.
 */

export const metadata = {
  title: "MapAble — Support Coordination",
  description: "AI-assisted support coordination for Care + Transport (NDIS)",
};

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Login" },
  { href: "/profile", label: "Profile" },
  { href: "/profile/identities", label: "Identities" },
  { href: "/consent", label: "Consent" },
  { href: "/calendar", label: "Calendar" },
  { href: "/coordinator/queue", label: "Queue" },
  { href: "/audit", label: "Audit" },
  { href: "/provider/workers", label: "Workers" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", color: "#111" }}>
        <nav style={{
          background: "#1e293b",
          color: "#f8fafc",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          gap: 0,
          height: 48,
          fontSize: 13,
          fontWeight: 500,
        }}>
          <a
            href="/"
            style={{
              color: "#38bdf8",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 15,
              marginRight: 24,
            }}
          >
            MapAble
          </a>
          {NAV_ITEMS.slice(1).map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                color: "#cbd5e1",
                textDecoration: "none",
                padding: "14px 12px",
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
