"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Share2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { generateInvite, revokeInvite } from "@/lib/actions/household";
import { formatInviteCode } from "@/lib/invite-code";

interface Invite {
  id: string;
  code: string;
  role: "member" | "caregiver";
  expires_at: string;
  use_count: number;
  max_uses: number | null;
  revoked_at: string | null;
}

export function InviteManager({
  invites,
  siteUrl,
}: {
  invites: Invite[];
  siteUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  const active = invites.filter(
    (i) => !i.revoked_at && new Date(i.expires_at) > new Date() && (i.max_uses == null || i.use_count < i.max_uses),
  );

  const onMint = (role: "member" | "caregiver" = "member") => {
    startTransition(async () => {
      const result = await generateInvite(role);
      if (result?.error) toast.error(result.error);
      else toast.success(`${role === "caregiver" ? "Caregiver" : "Partner"} invite created`);
    });
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      toast.success("Copied");
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  const share = async (code: string) => {
    const url = `${siteUrl}/onboarding/join?code=${code}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "Join our Baby Food household",
          text: `Use code ${formatInviteCode(code)} or open the link.`,
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copyToClipboard(url, code);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => onMint("member")} disabled={pending} className="w-full">
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          {pending ? "Creating…" : "Partner invite"}
        </Button>
        <Button
          onClick={() => onMint("caregiver")}
          disabled={pending}
          variant="outline"
          className="w-full"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Caregiver invite
        </Button>
      </div>

      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active invites. Generate one to share with your partner.
        </p>
      ) : (
        active.map((inv) => (
          <div key={inv.id} className="space-y-2 rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between">
              <code className="font-mono text-2xl font-bold tracking-widest">
                {formatInviteCode(inv.code)}
              </code>
              <div className="flex flex-col items-end gap-1 text-xs">
                <span className="rounded-full bg-accent px-2 py-0.5 capitalize text-accent-foreground">
                  {inv.role}
                </span>
                <span className="text-muted-foreground">
                  Expires {new Date(inv.expires_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(inv.code, inv.id)}
              >
                {copied === inv.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Code
              </Button>
              <Button size="sm" variant="outline" onClick={() => share(inv.code)}>
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <form action={revokeInvite}>
                <input type="hidden" name="id" value={inv.id} />
                <Button size="sm" variant="ghost" type="submit" className="w-full text-destructive">
                  Revoke
                </Button>
              </form>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
