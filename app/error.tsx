"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    fetch("/api/observability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        stack: error.stack?.slice(0, 4000),
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Something broke</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        We&apos;ve logged the issue. Try again — if it keeps happening, sign out and back in.
      </p>
      {error.digest && (
        <code className="text-xs text-muted-foreground">ref: {error.digest}</code>
      )}
      <Button onClick={reset}>Retry</Button>
    </main>
  );
}
