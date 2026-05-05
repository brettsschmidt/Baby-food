"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { quickLogFood } from "@/lib/actions/feedings";
import { parseVoiceIntent } from "@/lib/voice-intent";

interface SpeechRecognitionResult {
  transcript: string;
}

interface SpeechRecognitionAlternativeList {
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  results: { [i: number]: SpeechRecognitionAlternativeList; length: number };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

function getRecognition(): SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const Ctor: SpeechRecognitionConstructor | undefined =
    (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor })
      .webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.continuous = false;
  r.interimResults = false;
  r.lang = "en-US";
  return r;
}

export function VoiceButton() {
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setSupported(!!getRecognition());
  }, []);

  if (!supported) return null;

  const onClick = () => {
    if (busy) {
      recRef.current?.stop();
      setBusy(false);
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    recRef.current = rec;
    setBusy(true);

    rec.onresult = async (e: SpeechRecognitionEvent) => {
      const list = e.results[0] as unknown as SpeechRecognitionAlternativeList;
      const transcript = list[0]?.transcript ?? "";
      const intent = parseVoiceIntent(transcript);
      if (!intent) {
        toast.error(`Didn't catch that: "${transcript}"`);
        return;
      }
      const fd = new FormData();
      fd.set("custom_food", intent.food);
      try {
        await quickLogFood(fd);
        toast.success(`Logged ${intent.food}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to log");
      }
    };

    rec.onerror = () => {
      toast.error("Voice input failed");
      setBusy(false);
    };

    rec.onend = () => setBusy(false);
    rec.start();
  };

  return (
    <Button
      type="button"
      size="icon"
      variant={busy ? "default" : "outline"}
      onClick={onClick}
      aria-label={busy ? "Stop listening" : "Start voice quick-log"}
    >
      {busy ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
