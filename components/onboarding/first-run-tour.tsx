"use client";

import { useState } from "react";
import { ArrowRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const KEY = "babyfood_tour_done_v1";

const STEPS = [
  {
    title: "Welcome to Baby Food",
    body: "Plan, make, and log every meal — shared between both parents in real time.",
  },
  {
    title: "Quick log",
    body: "Tap the big Log button anytime. Or use the mic icon for hands-free logging.",
  },
  {
    title: "Inventory",
    body: "Track what's in the freezer with low-stock alerts and use-by dates.",
  },
  {
    title: "Insights",
    body: "See variety scores, mood trends, and a 72h allergen watch after first tries.",
  },
];

export function FirstRunTour() {
  const [step, setStep] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(KEY) ? null : 0;
  });

  if (step === null) return null;
  const s = STEPS[step];

  const dismiss = () => {
    localStorage.setItem(KEY, "1");
    setStep(null);
  };

  const next = () => {
    if (step + 1 >= STEPS.length) {
      dismiss();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-md px-4"
      role="dialog"
      aria-modal="false"
      aria-label="App tour"
    >
      <div className="rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Tip {step + 1} of {STEPS.length}
            </p>
            <h2 className="text-base font-semibold">{s.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={next}>
            {step + 1 === STEPS.length ? "Got it" : "Next"}
            {step + 1 < STEPS.length && <ArrowRight className="h-3 w-3" aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
