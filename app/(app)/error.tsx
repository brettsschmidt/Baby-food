"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app]", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">Couldn&apos;t load this page</h1>
      <p className="text-sm text-muted-foreground">
        Often a stale auth token. Try the button below.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
