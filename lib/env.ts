import { z } from "zod";

// ---------------------------------------------------------------------------
// Server-side environment schema
// ---------------------------------------------------------------------------
// Validated once at import time. If any required variable is missing the
// process exits with a human-readable error listing every issue.
// Optional variables are typed as `string | undefined` so call-sites must
// handle the absent case explicitly.
// ---------------------------------------------------------------------------

const serverSchema = z.object({
  // ── Database (Neon) ─────────────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .url()
    .startsWith("postgres", "Must be a Postgres connection string"),

  // ── Auth (Clerk) ────────────────────────────────────────────────────────
  CLERK_SECRET_KEY: z
    .string()
    .startsWith("sk_", "Must start with sk_"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_", "Must start with pk_"),

  // ── Search (Typesense Cloud) ────────────────────────────────────────────
  TYPESENSE_HOST: z.string().min(1),
  TYPESENSE_API_KEY: z.string().min(1),
  TYPESENSE_SEARCH_KEY: z.string().min(1).optional(),
  TYPESENSE_PORT: z.coerce.number().int().positive().default(443),
  TYPESENSE_PROTOCOL: z.enum(["https", "http"]).default("https"),

  // ── Workflows (Inngest) ─────────────────────────────────────────────────
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),

  // ── AI ──────────────────────────────────────────────────────────────────
  OPENAI_API_KEY: z
    .string()
    .startsWith("sk-", "Must start with sk-")
    .optional(),
  ANTHROPIC_API_KEY: z
    .string()
    .startsWith("sk-ant-", "Must start with sk-ant-")
    .optional(),

  // ── Storage (Vercel Blob — optional) ────────────────────────────────────
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),

  // ── Runtime meta ────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

// ---------------------------------------------------------------------------
// Client-side environment schema (NEXT_PUBLIC_* only)
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
        "Hint: copy .env.example to .env.local and fill in the values.\n",
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
  // In browser, NEXT_PUBLIC_* are inlined at build time, so we read them
  // from the global scope rather than process.env.
  const raw: Record<string, unknown> = {};
  if (typeof window !== "undefined") {
    raw.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  } else {
    raw.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  }

  const result = clientSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      "Invalid client environment variables:\n" +
        result.error.issues.map((i) => `  ✗ ${i.path.join(".")}: ${i.message}`).join("\n"),
    );
  }
  return result.data;
}
