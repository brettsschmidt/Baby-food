import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithMagicLink } from "@/lib/actions/auth";

export default function LoginPage() {
  return (
    <>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          We&apos;ll email you a magic link — no password needed.
        </p>
      </div>
      <form action={signInWithMagicLink} className="space-y-4">
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
        <Button type="submit" className="w-full" size="lg">
          Send magic link
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        By continuing you agree to our <Link href="/privacy" className="underline">privacy policy</Link>.
      </p>
    </>
  );
}
