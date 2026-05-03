import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyTotpChallenge } from "@/lib/actions/security";

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Two-factor code</h1>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app, or a recovery code.
          </p>
        </div>
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            That code didn&apos;t match. Try again.
          </div>
        )}
        <form action={verifyTotpChallenge} className="space-y-4">
          <input type="hidden" name="next" value={next ?? "/dashboard"} />
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              name="code"
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode="text"
              className="text-center font-mono text-lg tracking-widest"
            />
          </div>
          <Button type="submit" size="lg" className="w-full">
            Continue
          </Button>
        </form>
      </div>
    </main>
  );
}
