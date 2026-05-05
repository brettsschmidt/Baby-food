import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-md space-y-6">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl text-primary-foreground">
          🥕
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Homemade baby food, organised.
        </h1>
        <p className="text-muted-foreground">
          Plan batches, track what&apos;s in the freezer, and log every spoonful — shared between
          both parents.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Create an account</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
