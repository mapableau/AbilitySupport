/**
 * /login — Sign in / sign up page.
 *
 * In production this renders the Clerk <SignIn /> component.
 * Currently shows a stub UI that explains the auth flow.
 *
 * Once @clerk/nextjs is installed:
 *   import { SignIn } from "@clerk/nextjs";
 *   export default function LoginPage() {
 *     return <SignIn afterSignInUrl="/profile" afterSignUpUrl="/profile" />;
 *   }
 */

export default function LoginPage() {
  return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, fontFamily: "system-ui" }}>
      <div style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 32,
        textAlign: "center",
      }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          MapAble
        </h1>
        <p style={{ color: "#666", marginBottom: 32, fontSize: 14 }}>
          AI-assisted support coordination for Care + Transport
        </p>

        <div style={{
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
          textAlign: "left",
          fontSize: 14,
        }}>
          <strong style={{ display: "block", marginBottom: 8 }}>Auth Flow</strong>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>User signs in via Clerk (email, Google, or SSO)</li>
            <li>Clerk webhook fires → <code>/api/auth/webhook</code></li>
            <li>User synced to <code>users</code> table (clerk_id → uuid)</li>
            <li>Default role <code>participant</code> assigned on first login</li>
            <li>Session token includes roles → RBAC enforced on every route</li>
          </ol>
        </div>

        <div style={{
          background: "#fefce8",
          border: "1px solid #fde68a",
          borderRadius: 8,
          padding: 16,
          fontSize: 13,
          color: "#854d0e",
          marginBottom: 24,
        }}>
          Clerk integration pending. Set <code>CLERK_SECRET_KEY</code> and{" "}
          <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> in <code>.env.local</code>,
          then install <code>@clerk/nextjs</code>.
        </div>

        <p style={{ fontSize: 13, color: "#999" }}>
          For local development, use <code>x-user-id</code> and{" "}
          <code>x-organisation-id</code> headers to simulate auth.
        </p>
      </div>

      <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "#999" }}>
        <a href="/profile" style={{ color: "#2563eb" }}>Profile</a>
        {" · "}
        <a href="/coordinator/queue" style={{ color: "#2563eb" }}>Coordinator Queue</a>
        {" · "}
        <a href="/provider/workers" style={{ color: "#2563eb" }}>Provider Pool</a>
      </div>
    </div>
  );
}
