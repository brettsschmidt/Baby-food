"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Watches the service worker for an update and offers a one-tap refresh. */
export function SwUpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      if (reg.waiting) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(installing);
          }
        });
      });
    });

    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }, []);

  if (!waiting) return null;

  const apply = () => {
    waiting.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-md px-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-primary text-primary-foreground p-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span>A new version is ready.</span>
        </div>
        <Button size="sm" variant="secondary" onClick={apply}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
