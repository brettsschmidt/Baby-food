"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface Props {
  name: string;
  label?: string;
  defaultPath?: string | null;
}

const BUCKET = "household-photos";

export function PhotoField({ name, label = "Photo", defaultPath }: Props) {
  const [path, setPath] = useState<string | null>(defaultPath ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    const supabase = createClient();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: m } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (!m) return;

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const objectPath = `${m.household_id}/${u.user.id}/${Date.now()}.${ext}`;

    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));

    const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
    });
    setUploading(false);
    if (error) {
      alert(`Photo upload failed: ${error.message}`);
      setPreviewUrl(null);
      return;
    }
    setPath(objectPath);
  };

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <input type="hidden" name={name} value={path ?? ""} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      {previewUrl || path ? (
        <div className="relative inline-block">
          <Image
            src={previewUrl ?? `/api/photo?path=${encodeURIComponent(path!)}`}
            alt="Preview"
            width={120}
            height={120}
            unoptimized
            className="rounded-md border object-cover"
          />
          <button
            type="button"
            onClick={() => {
              setPreviewUrl(null);
              setPath(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background border shadow"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Camera className="h-4 w-4" />
          {uploading ? "Uploading…" : "Take or pick photo"}
        </Button>
      )}
    </div>
  );
}
