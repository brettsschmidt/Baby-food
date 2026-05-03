"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { quickLogFood } from "@/lib/actions/feedings";

interface Props {
  initialText: string;
  initialUrl: string;
}

export function ShareReceiveForms({ initialText, initialUrl }: Props) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState(initialUrl);
  const [pending, setPending] = useState(false);

  const onLogFeeding = async () => {
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("custom_food", text.split("\n")[0].trim());
      await quickLogFood(fd);
      toast.success("Saved as a feeding");
      router.push("/feedings");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  };

  const onSaveAsRecipe = () => {
    // Recipe creation form prefills via query string.
    const params = new URLSearchParams();
    if (text) params.set("name", text.split("\n")[0].slice(0, 80));
    if (url) params.set("source_url", url);
    router.push(`/recipes/new?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="text">Title / description</Label>
        <Textarea id="text" value={text} onChange={(e) => setText(e.target.value)} rows={3} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="url">Link</Label>
        <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={onSaveAsRecipe} variant="outline">
          Save as recipe
        </Button>
        <Button onClick={onLogFeeding} disabled={pending || !text}>
          {pending ? "Saving…" : "Log as feeding"}
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Or{" "}
        <Link href="/inventory/new" className="underline">
          add to inventory
        </Link>{" "}
        manually.
      </p>
    </div>
  );
}
