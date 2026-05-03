"use client";

import { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "household-photos";

interface Props {
  feedingId?: string;
  memoryId?: string;
}

export function VoiceRecorder({ feedingId, memoryId }: Props) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number>(0);

  const supported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  if (!supported) return null;

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => upload();
      recorderRef.current = recorder;
      startedAtRef.current = new Date().getTime();
      recorder.start();
      setRecording(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mic permission denied");
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  const upload = async () => {
    setUploading(true);
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const duration = Math.round((Date.now() - startedAtRef.current) / 1000);
      const supabase = createClient();
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sign in first");
      const { data: m } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!m) throw new Error("No household");

      const objectPath = `${m.household_id}/${u.user.id}/voice-${Date.now()}.webm`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, blob, { contentType: "audio/webm" });
      if (error) throw error;

      await supabase.from("voice_notes").insert({
        household_id: m.household_id,
        feeding_id: feedingId ?? null,
        memory_id: memoryId ?? null,
        storage_path: objectPath,
        duration_seconds: duration,
        mime_type: "audio/webm",
        created_by: u.user.id,
      });
      toast.success(`Saved ${duration}s voice note`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant={recording ? "default" : "outline"}
      onClick={recording ? stop : start}
      disabled={uploading}
      aria-label={recording ? "Stop recording" : "Record voice note"}
    >
      {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      {recording ? "Stop" : uploading ? "Uploading…" : "Voice note"}
    </Button>
  );
}
