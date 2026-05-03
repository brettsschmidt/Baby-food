"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmTotpEnrollment, startTotpEnrollment } from "@/lib/actions/security";

export function TotpEnrollment({ email }: { email: string }) {
  const [pending, startTransition] = useTransition();
  const [secret, setSecret] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<string[]>([]);

  const onStart = () => {
    startTransition(async () => {
      try {
        const r = await startTotpEnrollment();
        setSecret(r.secret);
        setRecovery(r.recovery);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to start enrollment");
      }
    });
  };

  if (!secret) {
    return (
      <Button onClick={onStart} disabled={pending} className="w-full">
        {pending ? "Generating…" : "Set up authenticator"}
      </Button>
    );
  }

  const otpauth = `otpauth://totp/Baby%20Food:${encodeURIComponent(email)}?secret=${secret}&issuer=Baby%20Food`;

  return (
    <div className="space-y-3 text-sm">
      <p>
        Scan this URL with your authenticator (1Password, Authy, Google Authenticator) — copy it
        if scanning isn&apos;t available:
      </p>
      <code className="block break-all rounded-md bg-muted px-2 py-1 text-xs">{otpauth}</code>
      <p>
        Or enter the secret manually:{" "}
        <code className="font-mono font-semibold">{secret}</code>
      </p>
      <form action={confirmTotpEnrollment} className="space-y-2">
        <Label htmlFor="code">Enter the 6-digit code</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
        />
        <Button type="submit" className="w-full">
          Confirm and enable
        </Button>
      </form>
      <div className="rounded-md border bg-amber-50/60 p-3 text-xs dark:bg-amber-950/30">
        <p className="font-medium">Recovery codes</p>
        <p className="text-muted-foreground">Save these somewhere safe. Each works once.</p>
        <ul className="mt-2 grid grid-cols-2 gap-1 font-mono">
          {recovery.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
