import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithMagicLink, signInWithPassword } from "@/lib/actions/auth";

const errorMessages: Record<string, string> = {
  auth_failed: "That magic link expired or was already used. Try sending a new one.",
  rate_limited: "Hit the rate limit — wait a minute and try again.",
  invalid_credentials: "Email or password is incorrect.",
  missing_fields: "Enter both your email and password.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  return (
    <>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with your password, or get a magic link by email.
        </p>
      </div>
      {error && errorMessages[error] && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessages[error]}
        </div>
      )}
      {sent && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          Magic link sent. Check your inbox on this device.
        </div>
      )}

      <form action={signInWithPassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" className="w-full" size="lg">
          Sign in
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={signInWithMagicLink} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="magic-email">Email me a magic link</Label>
          <Input
            id="magic-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>
        <Button type="submit" variant="outline" className="w-full" size="lg">
          Send magic link
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-foreground underline">
          Sign up
        </Link>
      </p>

      <p className="text-center text-xs text-muted-foreground">
        By continuing you agree to our{" "}
        <Link href="/privacy" className="underline">
          privacy policy
        </Link>
        .
      </p>
    </>
  );
}
