"use client";

import { useState } from "react";

import { Markdown } from "@/components/markdown/markdown";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
  id?: string;
}

export function MarkdownEditor({ name, defaultValue, rows = 8, placeholder, id }: Props) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");

  return (
    <div className="space-y-2">
      <div className="flex gap-1 text-xs">
        {(["write", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md border px-2 py-1 capitalize",
              tab === t ? "bg-primary text-primary-foreground" : "bg-background",
            )}
          >
            {t}
          </button>
        ))}
        <span className="ml-2 text-muted-foreground">
          Markdown supported · **bold** *italic* `code` # heading
        </span>
      </div>
      {tab === "write" ? (
        <Textarea
          id={id}
          name={name}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="font-mono"
        />
      ) : (
        <div className="rounded-md border bg-card/50 p-3 text-sm">
          {value ? <Markdown source={value} /> : (
            <p className="text-muted-foreground">Nothing to preview yet.</p>
          )}
          <input type="hidden" name={name} value={value} />
        </div>
      )}
    </div>
  );
}
