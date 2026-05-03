"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { flush, listQueued } from "@/lib/offline-queue";

async function send(payload: Record<string, FormDataEntryValue | FormDataEntryValue[]>) {
  const res = await fetch("/api/feedings/queue", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
}

export function OfflineBridge() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const refresh = async () => {
      const items = await listQueued();
      setPending(items.length);
    };
    refresh();

    const onOnline = async () => {
      setOnline(true);
      const result = await flush(send);
      if (result.flushed > 0) toast.success(`Synced ${result.flushed} feeding(s)`);
      refresh();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const interval = setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(interval);
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div className="flex items-center justify-between rounded-md border bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <span className="flex items-center gap-2">
        {online ? <RefreshCcw className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
        {online
          ? `${pending} pending — syncing`
          : pending > 0
            ? `Offline · ${pending} queued`
            : "You're offline"}
      </span>
    </div>
  );
}
