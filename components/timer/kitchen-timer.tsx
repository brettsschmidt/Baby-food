"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRESETS = [
  { label: "Steam veg (8m)", seconds: 8 * 60 },
  { label: "Boil pasta (10m)", seconds: 10 * 60 },
  { label: "Roast (40m)", seconds: 40 * 60 },
  { label: "Bottle warm (3m)", seconds: 3 * 60 },
];

function format(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export function KitchenTimer() {
  const [target, setTarget] = useState(8 * 60);
  const [remaining, setRemaining] = useState(8 * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setRunning(false);
          if (typeof window !== "undefined") {
            try {
              navigator.vibrate?.([300, 100, 300]);
            } catch {
              /* unsupported */
            }
          }
          toast.success("Timer done!");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const start = (seconds: number) => {
    setTarget(seconds);
    setRemaining(seconds);
    setRunning(true);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="font-mono text-5xl font-bold tabular-nums">{format(remaining)}</p>
        <p className="text-xs text-muted-foreground">target {format(target)}</p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button
          size="lg"
          onClick={() => setRunning((r) => !r)}
          aria-label={running ? "Pause timer" : "Start timer"}
        >
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? "Pause" : "Start"}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => {
            setRemaining(target);
            setRunning(false);
          }}
          aria-label="Reset timer"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.label}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => start(p.seconds)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const m = Number(fd.get("minutes") ?? 0);
          if (m > 0 && m < 600) start(Math.round(m * 60));
        }}
      >
        <div className="flex-1 space-y-1">
          <label htmlFor="minutes" className="text-xs">
            Custom (minutes)
          </label>
          <Input id="minutes" name="minutes" type="number" min="1" max="599" defaultValue={5} />
        </div>
        <Button type="submit" variant="secondary">
          Set
        </Button>
      </form>
    </div>
  );
}
