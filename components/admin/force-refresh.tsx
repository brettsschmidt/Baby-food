"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ForceRefresh() {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((n) => caches.delete(n)));
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onClick}>
      {busy ? "Refreshing…" : "Force-unregister SW + reload"}
    </Button>
  );
}
