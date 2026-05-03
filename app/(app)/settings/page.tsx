import Link from "next/link";
import { Activity, BookOpen, FileText, Globe, LogOut, ShoppingCart, Users } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteManager } from "@/components/household/invite-card";
import { PushToggle } from "@/components/push/push-toggle";
import { DeleteAccountButton } from "@/components/account/delete-account-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signOut } from "@/lib/actions/auth";
import { addBabyFromSettings } from "@/lib/actions/babies";
import {
  toggleSharedFoodsOptIn,
  updateActivityRetention,
  updateBabyAllergens,
  updateExpiryDefaults,
  updateHouseholdTheme,
  updateNotifyPrefs,
} from "@/lib/actions/household-settings";
import { clearActivityLog } from "@/lib/actions/activity";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";
import { formatBytes, getStorageUsage } from "@/lib/queries/storage";

const COMMON_ALLERGENS = [
  "egg",
  "milk",
  "peanut",
  "tree_nut",
  "soy",
  "wheat",
  "fish",
  "shellfish",
  "sesame",
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const { householdId, role, email, userId } = await requireHousehold(supabase);

  type MemberRow = {
    user_id: string;
    role: "owner" | "member";
    joined_at: string;
    profiles: { display_name: string | null } | null;
  };

  const [
    { data: household },
    { data: members },
    { data: invites },
    { data: babies },
    { data: prefs },
    storage,
  ] = await Promise.all([
    supabase
      .from("households")
      .select(
        "name, theme_color, accent_emoji, default_freezer_expiry_days, default_fridge_expiry_days, default_pantry_expiry_days, activity_retention_days, shared_foods_opt_in",
      )
      .eq("id", householdId)
      .maybeSingle(),
    supabase
      .from("household_members")
      .select("user_id, role, joined_at, profiles(display_name)")
      .eq("household_id", householdId)
      .returns<MemberRow[]>(),
    supabase
      .from("household_invites")
      .select("id, code, role, expires_at, use_count, max_uses, revoked_at")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false }),
    supabase
      .from("babies")
      .select("id, name, birth_date, known_allergens")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true }),
    supabase
      .from("household_member_prefs")
      .select(
        "notify_on_partner_log, notify_on_low_stock, notify_weekly_digest, digest_send_dow, digest_send_hour, quiet_hours_start, quiet_hours_end",
      )
      .eq("household_id", householdId)
      .eq("user_id", userId)
      .maybeSingle(),
    getStorageUsage(supabase, householdId),
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
              <Link href="/library">
                <Globe className="h-4 w-4" /> Shared food library
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/shopping">
                <ShoppingCart className="h-4 w-4" /> Shopping list
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/care">
                <Activity className="h-4 w-4" /> Sleep & diapers
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/growth">
                <Activity className="h-4 w-4" /> Growth log
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
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/settings/security">
                <FileText className="h-4 w-4" /> Security (2FA)
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/memories">
                <FileText className="h-4 w-4" /> Memories
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/recipes/collections">
                <BookOpen className="h-4 w-4" /> Recipe collections
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/meals">
                <FileText className="h-4 w-4" /> Today&apos;s meals
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/feedings/calendar">
                <FileText className="h-4 w-4" /> Feeding calendar
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/timer">
                <FileText className="h-4 w-4" /> Kitchen timer
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/inventory/import">
                <FileText className="h-4 w-4" /> Bulk import inventory
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <a href="/api/data/export" download>
                <FileText className="h-4 w-4" /> Export all data (ZIP)
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/insights/waste">
                <FileText className="h-4 w-4" /> Waste analytics
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/print/monthly">
                <FileText className="h-4 w-4" /> Monthly recap (print)
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/print/meal-plan">
                <FileText className="h-4 w-4" /> Weekly meal plan (print)
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/feedings/import">
                <FileText className="h-4 w-4" /> Import feedings (CSV)
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
            {role === "owner" && (
              <form action={updateHouseholdTheme} className="space-y-3 border-b pb-3">
                <div className="space-y-1">
                  <Label htmlFor="hh-name" className="text-xs">
                    Name
                  </Label>
                  <Input
                    id="hh-name"
                    name="name"
                    defaultValue={household?.name ?? ""}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="theme_color" className="text-xs">
                      Accent color
                    </Label>
                    <Input
                      id="theme_color"
                      name="theme_color"
                      type="color"
                      defaultValue={household?.theme_color ?? "#3f9d4a"}
                      className="h-11 w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="accent_emoji" className="text-xs">
                      Emoji
                    </Label>
                    <Input
                      id="accent_emoji"
                      name="accent_emoji"
                      defaultValue={household?.accent_emoji ?? "🥕"}
                      maxLength={4}
                    />
                  </div>
                </div>
                <Button type="submit" size="sm" className="w-full">
                  Save household
                </Button>
              </form>
            )}
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
            <CardDescription>
              Set known allergens to block accidental exposure when logging.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {babies?.map((b) => (
              <form
                key={b.id}
                action={updateBabyAllergens}
                className="space-y-2 border-b pb-3 last:border-0 last:pb-0"
              >
                <input type="hidden" name="id" value={b.id} />
                <div className="flex items-center justify-between">
                  <span className="font-medium">{b.name}</span>
                  <span className="text-xs text-muted-foreground">{b.birth_date}</span>
                </div>
                <Label className="text-xs" htmlFor={`alg-${b.id}`}>
                  Known allergens (comma-separated)
                </Label>
                <Input
                  id={`alg-${b.id}`}
                  name="allergens"
                  defaultValue={(b.known_allergens ?? []).join(", ")}
                  placeholder={COMMON_ALLERGENS.slice(0, 3).join(", ")}
                />
                <Button type="submit" size="sm" variant="outline">
                  Save allergens
                </Button>
                {b.known_allergens && b.known_allergens.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {b.known_allergens.map((a) => (
                      <Badge key={a} variant="warning">
                        {a}
                      </Badge>
                    ))}
                  </div>
                )}
              </form>
            ))}
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
          <>
            <Card>
              <CardHeader>
                <CardTitle>Expiry defaults</CardTitle>
                <CardDescription>
                  Used to auto-fill the use-by date when adding inventory.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={updateExpiryDefaults} className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="freezer" className="text-xs">
                      Freezer
                    </Label>
                    <Input
                      id="freezer"
                      name="freezer"
                      type="number"
                      min="1"
                      defaultValue={household?.default_freezer_expiry_days ?? 60}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="fridge" className="text-xs">
                      Fridge
                    </Label>
                    <Input
                      id="fridge"
                      name="fridge"
                      type="number"
                      min="1"
                      defaultValue={household?.default_fridge_expiry_days ?? 3}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pantry" className="text-xs">
                      Pantry
                    </Label>
                    <Input
                      id="pantry"
                      name="pantry"
                      type="number"
                      min="1"
                      defaultValue={household?.default_pantry_expiry_days ?? 365}
                    />
                  </div>
                  <Button type="submit" size="sm" className="col-span-3 mt-2">
                    Save defaults (days)
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privacy & data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <form action={updateActivityRetention} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="retention" className="text-xs">
                      Activity log retention (days)
                    </Label>
                    <Input
                      id="retention"
                      name="days"
                      type="number"
                      min="7"
                      max="3650"
                      defaultValue={household?.activity_retention_days ?? 365}
                    />
                  </div>
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                </form>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href="/api/activity/export" download>
                      Export activity (CSV)
                    </a>
                  </Button>
                  <form action={clearActivityLog}>
                    <Button type="submit" size="sm" variant="outline" className="text-destructive">
                      Clear all activity
                    </Button>
                  </form>
                </div>
                <form action={toggleSharedFoodsOptIn} className="flex items-center justify-between">
                  <div className="text-xs">
                    <p className="font-medium">Share foods anonymously</p>
                    <p className="text-muted-foreground">
                      Lets other parents discover foods you log. No identifying data.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={household?.shared_foods_opt_in ?? false}
                    className="h-5 w-5"
                  />
                  <Button type="submit" size="sm" variant="outline">
                    Save
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground">
                  Photos: {storage.files} files · {formatBytes(storage.totalBytes)}
                </p>
              </CardContent>
            </Card>
          </>
        )}

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
          </CardHeader>
          <CardContent className="space-y-3">
            <PushToggle />
            <form action={updateNotifyPrefs} className="space-y-2 border-t pt-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="notify_on_partner_log"
                  defaultChecked={prefs?.notify_on_partner_log ?? true}
                />
                Ping me when my partner logs a feeding
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="notify_on_low_stock"
                  defaultChecked={prefs?.notify_on_low_stock ?? true}
                />
                Ping me on low stock
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="notify_weekly_digest"
                  defaultChecked={prefs?.notify_weekly_digest ?? false}
                />
                Send a weekly digest
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="digest_send_dow" className="text-xs">
                    Day
                  </Label>
                  <select
                    id="digest_send_dow"
                    name="digest_send_dow"
                    defaultValue={prefs?.digest_send_dow ?? 0}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="digest_send_hour" className="text-xs">
                    Hour (UTC)
                  </Label>
                  <Input
                    id="digest_send_hour"
                    name="digest_send_hour"
                    type="number"
                    min="0"
                    max="23"
                    defaultValue={prefs?.digest_send_hour ?? 9}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t pt-2">
                <div className="space-y-1">
                  <Label htmlFor="quiet_hours_start" className="text-xs">
                    Quiet hours start (UTC)
                  </Label>
                  <Input
                    id="quiet_hours_start"
                    name="quiet_hours_start"
                    type="number"
                    min="0"
                    max="23"
                    defaultValue={prefs?.quiet_hours_start ?? ""}
                    placeholder="22"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="quiet_hours_end" className="text-xs">
                    Quiet hours end
                  </Label>
                  <Input
                    id="quiet_hours_end"
                    name="quiet_hours_end"
                    type="number"
                    min="0"
                    max="23"
                    defaultValue={prefs?.quiet_hours_end ?? ""}
                    placeholder="7"
                  />
                </div>
              </div>
              <Button type="submit" size="sm" className="w-full">
                Save notifications
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>{email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <form action={signOut}>
              <Button type="submit" variant="outline" className="w-full">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </form>
            <DeleteAccountButton />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
