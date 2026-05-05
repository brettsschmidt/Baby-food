"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const ROUTES: Record<string, string> = {
  d: "/dashboard",
  i: "/inventory",
  f: "/feedings",
  p: "/planner",
  m: "/meals",
  c: "/care",
  g: "/growth",
  r: "/recipes",
  s: "/shopping",
  n: "/insights",
  o: "/memories",
  t: "/timer",
};

/**
 * Two-key shortcuts: press "g" then a target letter, e.g. "gd" → /dashboard.
 * "/" focuses the search input on /search; we just navigate there.
 */
export function KeyboardShortcuts() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [first, setFirst] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        startTransition(() => router.push("/search"));
        return;
      }

      if (first === "g") {
        const next = ROUTES[e.key.toLowerCase()];
        setFirst(null);
        if (next) {
          e.preventDefault();
          startTransition(() => router.push(next));
        }
        return;
      }

      if (e.key === "g") {
        setFirst("g");
        setTimeout(() => setFirst(null), 1200);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [first, router]);

  return null;
}
