import { z } from "zod";

// ---------------------------------------------------------------------------
// Server-side environment schema
// ---------------------------------------------------------------------------
// Validated once at import time. If any required variable is missing the
// process exits with a human-readable error listing every issue.
//
// Three tiers:
//   Required    — always required; build fails without them
//   Production  — required when NODE_ENV=production; optional in dev
//   Optional    — typed as string | undefined; call-sites handle absence
// ---------------------------------------------------------------------------

const nodeEnvSchema = z
  .enum(["development", "test", "production"])
  .default("development");

const currentNodeEnv = nodeEnvSchema.parse(process.env.NODE_ENV);
const isProd = currentNodeEnv === "production";

function requiredInProd() {
  return isProd
    ? z.string().min(1, "Required in production")
    : z.string().min(1).optional();
}

const serverSchema = z.object({
  NODE_ENV: nodeEnvSchema,

  // ── Database (Neon) ─────────────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .url("Must be a valid URL")
    .startsWith("postgres", "Must be a Postgres connection string"),

  // ── Auth (Clerk) ────────────────────────────────────────────────────────
  CLERK_SECRET_KEY: z
    .string()
    .startsWith("sk_", "Must start with sk_"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_", "Must start with pk_"),

  // ── Vercel deployment ───────────────────────────────────────────────────
  VERCEL_PROJECT_ID: requiredInProd(),
  VERCEL_TOKEN: requiredInProd(),

  // ── Search (Typesense Cloud) ────────────────────────────────────────────
  TYPESENSE_HOST: z.string().min(1),
  TYPESENSE_API_KEY: z.string().min(1),
  TYPESENSE_SEARCH_KEY: z.string().min(1).optional(),
  TYPESENSE_PORT: z.coerce.number().int().positive().default(443),
  TYPESENSE_PROTOCOL: z.enum(["https", "http"]).default("https"),

  // ── Workflows (Inngest) ─────────────────────────────────────────────────
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: requiredInProd(),

  // ── Federation SSO (Disapedia OIDC + AccessiBooks SAML) ─────────────────
  // Configured in Clerk dashboard; these env vars pass connection IDs and
  // optional webhook secrets so the app can verify federation callbacks.
  CLERK_SSO_DISAPEDIA_CONNECTION_ID: z.string().min(1).optional(),
  CLERK_SSO_ACCESSIBOOKS_CONNECTION_ID: z.string().min(1).optional(),
  CLERK_WEBHOOK_SECRET: requiredInProd(),

  // ── AI ──────────────────────────────────────────────────────────────────
  OPENAI_API_KEY: z
    .string()
    .startsWith("sk-", "Must start with sk-")
    .optional(),
  ANTHROPIC_API_KEY: z
    .string()
    .startsWith("sk-ant-", "Must start with sk-ant-")
    .optional(),

  // ── Storage (Vercel Blob) ──────────────────────────────────────────────
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

// ---------------------------------------------------------------------------
// Client-side environment schema (NEXT_PUBLIC_* only)
// ---------------------------------------------------------------------------
// Validated separately because client bundles cannot access server env vars.
// Call validateClientEnv() from a root layout to get early feedback.
// ---------------------------------------------------------------------------

const clientSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_", "Must start with pk_"),
});

export type ClientEnv = z.infer<typeof clientSchema>;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateEnv(): ServerEnv {
  const result = serverSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => {
        const path = issue.path.join(".");
        return `  ✗ ${path}: ${issue.message}`;
      })
      .join("\n");

    console.error(
      "\n┌─────────────────────────────────────────────┐\n" +
        "│  ⚠  Missing or invalid environment variables │\n" +
        "└─────────────────────────────────────────────┘\n\n" +
        formatted +
        "\n\n" +
        `Environment: ${currentNodeEnv}\n` +
        "Hint: copy .env.example to .env.local and fill in the values.\n" +
        "See docs/ENVIRONMENT.md for the full reference.\n",
    );
    process.exit(1);
  }

  return result.data;
}

/**
 * Validated server environment — import this wherever you need env vars.
 *
 * ```ts
 * import { env } from "@/lib/env";
 * const url = env.DATABASE_URL;
 * ```
 *
 * Crashes at startup with a clear message if required vars are missing.
 */
export const env: ServerEnv = validateEnv();

/**
 * Validate client-side public env vars.
 * Call from a client component or layout to get early feedback.
 */
export function validateClientEnv(): ClientEnv {
  const raw: Record<string, unknown> = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  };

  const result = clientSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      "Invalid client environment variables:\n" +
        result.error.issues
          .map((i) => `  ✗ ${i.path.join(".")}: ${i.message}`)
          .join("\n"),
    );
  }
  return result.data;
}
