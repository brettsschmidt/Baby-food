import "server-only";

/**
 * Lightweight Sentry-compatible event reporter. We don't bundle the Sentry
 * SDK — it requires build-time wiring that conflicts with Serwist/webpack
 * config in this project. Instead, this posts JSON to the Sentry "store"
 * endpoint when SENTRY_DSN is set; otherwise it logs to console.
 *
 * For production deployments you can swap this out for `@sentry/nextjs`
 * later by replacing the body of `captureException`.
 */

interface ParsedDsn {
  publicKey: string;
  projectId: string;
  host: string;
  protocol: string;
}

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    if (!url.username || !projectId) return null;
    return {
      publicKey: url.username,
      projectId,
      host: url.host,
      protocol: url.protocol.replace(":", ""),
    };
  } catch {
    return null;
  }
}

export async function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.error("[observability]", error, context);
    return;
  }
  const parsed = parseDsn(dsn);
  if (!parsed) return;

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const body = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    platform: "javascript",
    level: "error",
    server_name: "baby-food",
    extra: context,
    exception: {
      values: [
        {
          type: error instanceof Error ? error.name : "Error",
          value: message,
          stacktrace: stack ? { frames: [{ filename: "stack", function: stack.slice(0, 500) }] } : undefined,
        },
      ],
    },
  };

  const url = `${parsed.protocol}://${parsed.host}/api/${parsed.projectId}/store/`;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=baby-food/0.1`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Don't let observability failures cascade.
  }
}
