import Link from "next/link";
import { Activity, BookOpen, FileText, LogOut, ShoppingCart, Users } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteManager } from "@/components/household/invite-card";
import { PushToggle } from "@/components/push/push-toggle";
import { signOut } from "@/lib/actions/auth";
import { addBabyFromSettings } from "@/lib/actions/babies";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { householdId, role, email } = await requireHousehold(supabase);

  type MemberRow = {
    user_id: string;
    role: "owner" | "member";
    joined_at: string;
    profiles: { display_name: string | null } | null;
  };

  const [{ data: household }, { data: members }, { data: invites }, { data: babies }] =
    await Promise.all([
      supabase.from("households").select("name").eq("id", householdId).maybeSingle(),
      supabase
        .from("household_members")
        .select("user_id, role, joined_at, profiles(display_name)")
        .eq("household_id", householdId)
        .returns<MemberRow[]>(),
      supabase
        .from("household_invites")
        .select("id, code, expires_at, use_count, max_uses, revoked_at")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false }),
      supabase
        .from("babies")
        .select("id, name, birth_date")
        .eq("household_id", householdId)
        .order("created_at", { ascending: true }),
    ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <>
      <AppHeader title="Settings" />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/recipes">
                <BookOpen className="h-4 w-4" /> Recipes
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/shopping">
                <ShoppingCart className="h-4 w-4" /> Shopping list
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/activity">
                <Activity className="h-4 w-4" /> Activity feed
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/print/report?days=30" target="_blank">
                <FileText className="h-4 w-4" /> Pediatrician report
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Household</CardTitle>
            <CardDescription>{household?.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                Members
              </h3>
              <ul className="space-y-1 text-sm">
                {members?.map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between">
                    <span>{m.profiles?.display_name ?? "Member"}</span>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      {m.role}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Babies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1 text-sm">
              {babies?.map((b) => (
                <li key={b.id} className="flex items-center justify-between">
                  <span>{b.name}</span>
                  <span className="text-xs text-muted-foreground">{b.birth_date}</span>
                </li>
              ))}
            </ul>
            <form action={addBabyFromSettings} className="space-y-2 border-t pt-3">
              <p className="text-xs font-medium">Add another baby</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="baby-name" className="text-xs">
                    Name
                  </Label>
                  <Input id="baby-name" name="name" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="baby-bd" className="text-xs">
                    Birth date
                  </Label>
                  <Input id="baby-bd" name="birth_date" type="date" required />
                </div>
              </div>
              <Button type="submit" size="sm" variant="outline" className="w-full">
                Add baby
              </Button>
            </form>
          </CardContent>
        </Card>

        {role === "owner" && (
          <Card>
            <CardHeader>
              <CardTitle>Invite a partner</CardTitle>
              <CardDescription>
                Codes expire after 7 days and work for one person.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteManager invites={invites ?? []} siteUrl={siteUrl} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Get a ping when your partner logs a feeding or stock runs low.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PushToggle />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>{email}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signOut}>
              <Button type="submit" variant="outline" className="w-full">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
