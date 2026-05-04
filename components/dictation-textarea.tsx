"use client";

import { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult:
    | ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void)
    | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

function getRecognition(): SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const Ctor =
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

interface Props extends React.ComponentProps<typeof Textarea> {
  name: string;
}

/** Textarea with a mic button that appends dictated text. */
export function DictationTextarea({ defaultValue, ...props }: Props) {
  const [value, setValue] = useState(String(defaultValue ?? ""));
  const [busy, setBusy] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);
  const supported = typeof window !== "undefined" && !!getRecognition();

  const toggle = () => {
    if (busy) {
      recRef.current?.stop();
      setBusy(false);
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    recRef.current = rec;
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript ?? "";
      setValue((v) => (v ? `${v} ${t}` : t));
    };
    rec.onend = () => setBusy(false);
    setBusy(true);
    rec.start();
  };

  return (
    <div className="relative">
      <Textarea {...props} value={value} onChange={(e) => setValue(e.target.value)} />
      {supported && (
        <Button
          type="button"
          size="icon"
          variant={busy ? "default" : "ghost"}
          onClick={toggle}
          aria-label={busy ? "Stop dictation" : "Dictate"}
          className="absolute right-1 top-1 h-7 w-7"
        >
          {busy ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
        </Button>
      )}
    </div>
  );
}
