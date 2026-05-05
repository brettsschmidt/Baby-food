"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const THRESHOLD = 80;

export function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);
  const refreshing = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      startY.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
      if (dy > 0 && window.scrollY === 0) {
        setPull(Math.min(THRESHOLD * 1.5, dy));
      }
    };
    const onTouchEnd = () => {
      if (pull >= THRESHOLD && !refreshing.current) {
        refreshing.current = true;
        router.refresh();
        setTimeout(() => {
          refreshing.current = false;
          setPull(0);
        }, 600);
      } else {
        setPull(0);
      }
      startY.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, router]);

  if (pull === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-center text-xs text-muted-foreground"
      style={{ height: `${pull}px`, transition: pull === 0 ? "height 0.2s" : undefined }}
    >
      <span>{pull >= THRESHOLD ? "↑ release to refresh" : "↓ pull to refresh"}</span>
    </div>
  );
}
