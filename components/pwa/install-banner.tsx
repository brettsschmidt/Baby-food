"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "babyfood_install_dismissed_at";
const COOLDOWN_DAYS = 14;

export function InstallBanner() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (stored && Date.now() - stored < COOLDOWN_DAYS * 86400_000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const onInstall = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setVisible(false);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div className="rounded-md border bg-primary/5 p-3 text-sm">
      <div className="flex items-center gap-3">
        <Download className="h-4 w-4 text-primary" aria-hidden="true" />
        <div className="flex-1">
          <p className="font-medium">Install Baby Food</p>
          <p className="text-xs text-muted-foreground">
            Add to home screen for one-tap logging.
          </p>
        </div>
        <Button size="sm" onClick={onInstall}>
          Install
        </Button>
        <button
          type="button"
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
