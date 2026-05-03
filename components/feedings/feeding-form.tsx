"use client";

import { useFormStatus } from "react-dom";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { enqueue } from "@/lib/offline-queue";
import { logFeeding } from "@/lib/actions/feedings";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Saving…" : children}
    </Button>
  );
}

export function FeedingForm({ children }: { children: React.ReactNode }) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="flex-1 space-y-4 px-4 py-4 pb-8"
      action={async (fd: FormData) => {
        // If we know we're offline, queue immediately and short-circuit.
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          const payload: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
          fd.forEach((v, k) => {
            if (k in payload) {
              const ex = payload[k];
              payload[k] = Array.isArray(ex) ? [...ex, v] : [ex as FormDataEntryValue, v];
            } else {
              payload[k] = v;
            }
          });
          await enqueue(payload);
          toast.success("Saved offline — will sync when you reconnect");
          return;
        }
        setSubmitting(true);
        try {
          await logFeeding(fd);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {children}
      <SubmitButton>{submitting ? "Saving…" : "Save feeding"}</SubmitButton>
    </form>
  );
}
