"use client";

import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ImportResult {
  name?: string;
  description?: string;
  ingredients?: string[];
  instructions?: string;
  prepMinutes?: number;
  yield?: string;
  sourceUrl: string;
}

function setFieldValue(name: string, value: string | number | undefined) {
  if (value == null || value === "") return;
  const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
  if (el) el.value = String(value);
}

export function UrlImporter() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const onImport = async () => {
    if (!url) return;
    setBusy(true);
    try {
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? "Import failed");
      }
      const data = (await res.json()) as ImportResult;
      setFieldValue("name", data.name);
      setFieldValue("description", data.description);
      setFieldValue("ingredients", (data.ingredients ?? []).join("\n"));
      setFieldValue("steps", data.instructions);
      setFieldValue("prep_minutes", data.prepMinutes);
      setFieldValue("source_url", data.sourceUrl);
      toast.success("Recipe imported — review and save");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border bg-card/50 p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Import from URL
      </p>
      <div className="flex gap-2">
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://blog.example.com/sweet-potato-puree"
          className="flex-1"
        />
        <Button type="button" onClick={onImport} disabled={busy || !url} variant="outline">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Import
        </Button>
      </div>
    </div>
  );
}
