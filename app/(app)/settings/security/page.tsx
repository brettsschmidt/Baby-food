import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TotpEnrollment } from "@/components/security/totp-enrollment";
import { disableTotp } from "@/lib/actions/security";
import { createClient } from "@/lib/supabase/server";

export default async function SecurityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: totp } = user
    ? await supabase
        .from("totp_secrets")
        .select("confirmed_at")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const enabled = !!totp?.confirmed_at;

  return (
    <>
      <AppHeader
        title="Security"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> Two-factor auth
            </CardTitle>
            <CardDescription>
              Adds a 6-digit code from your authenticator app at sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enabled ? (
              <form action={disableTotp}>
                <Button type="submit" variant="outline" className="w-full text-destructive">
                  Disable 2FA
                </Button>
              </form>
            ) : (
              <TotpEnrollment email={user?.email ?? "you"} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
