import { notFound } from "next/navigation";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sparkline } from "@/components/growth/sparkline";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data: linkRow } = await admin
    .from("share_links")
    .select("household_id, scope, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!linkRow) notFound();
  if (linkRow.revoked_at || new Date(linkRow.expires_at) < new Date()) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">Link expired</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask the family to share a fresh link.
        </p>
      </main>
    );
  }

  // Bump view count (best-effort)
  await admin
    .from("share_links")
    .update({
      view_count: (
        await admin.from("share_links").select("view_count").eq("token", token).maybeSingle()
      ).data?.view_count ?? 0,
      last_viewed_at: new Date().toISOString(),
    })
    .eq("token", token);

  const { household_id: householdId, scope } = linkRow;

  const [{ data: household }, { data: babies }] = await Promise.all([
    admin.from("households").select("name, accent_emoji").eq("id", householdId).maybeSingle(),
    admin
      .from("babies")
      .select("id, name, birth_date")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true }),
  ]);

  const baby = babies?.[0];
  const showFeed = scope === "all" || scope === "feed";
  const showGrowth = scope === "all" || scope === "growth";
  const showMemories = scope === "all" || scope === "memories";

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-8">
      <header className="space-y-1 text-center">
        <div className="text-3xl">{household?.accent_emoji ?? "🥕"}</div>
        <h1 className="text-xl font-semibold">{household?.name ?? "Family"}</h1>
        {baby && (
          <p className="text-xs text-muted-foreground">
            {baby.name} · born {format(new Date(baby.birth_date), "PPP")}
          </p>
        )}
        <Badge variant="secondary" className="mt-2">
          Read-only family view
        </Badge>
      </header>

      {showFeed && baby && <FeedSection householdId={householdId} babyId={baby.id} />}
      {showGrowth && baby && <GrowthSection babyId={baby.id} birthDate={baby.birth_date} />}
      {showMemories && <MemoriesSection householdId={householdId} />}
    </main>
  );
}

async function FeedSection({ householdId, babyId }: { householdId: string; babyId: string }) {
  const admin = createAdminClient();
  const { data: feedings } = await admin
    .from("feedings")
    .select("id, fed_at, mood, feeding_items(notes, inventory_items(name), foods(name))")
    .eq("household_id", householdId)
    .eq("baby_id", babyId)
    .is("archived_at", null)
    .order("fed_at", { ascending: false })
    .limit(20)
    .returns<
      {
        id: string;
        fed_at: string;
        mood: string | null;
        feeding_items: {
          notes: string | null;
          inventory_items: { name: string | null } | null;
          foods: { name: string | null } | null;
        }[];
      }[]
    >();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent meals</CardTitle>
      </CardHeader>
      <CardContent>
        {(feedings ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No feedings yet.</p>
        ) : (
          <ol className="space-y-1 text-sm">
            {feedings!.map((f) => {
              const name =
                f.feeding_items[0]?.inventory_items?.name ??
                f.feeding_items[0]?.foods?.name ??
                f.feeding_items[0]?.notes ??
                "Feeding";
              return (
                <li key={f.id} className="flex items-center justify-between border-b pb-1 last:border-0">
                  <span>{name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(f.fed_at), "MMM d, h:mm a")}
                    {f.mood ? ` · ${f.mood}` : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

async function GrowthSection({ babyId, birthDate }: { babyId: string; birthDate: string }) {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("growth_measurements")
    .select("measured_on, weight_kg, length_cm, head_cm")
    .eq("baby_id", babyId)
    .order("measured_on", { ascending: true });

  const birth = new Date(birthDate).getTime();
  const dayOf = (d: string) => Math.round((new Date(d).getTime() - birth) / 86400000);
  const weight = (rows ?? [])
    .filter((r) => r.weight_kg != null)
    .map((r) => ({ x: dayOf(r.measured_on), y: Number(r.weight_kg) }));
  const length = (rows ?? [])
    .filter((r) => r.length_cm != null)
    .map((r) => ({ x: dayOf(r.measured_on), y: Number(r.length_cm) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Growth</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Sparkline points={weight} label="Weight" unit="kg" metric="weight_kg" />
        <Sparkline points={length} label="Length" unit="cm" metric="length_cm" />
      </CardContent>
    </Card>
  );
}

async function MemoriesSection({ householdId }: { householdId: string }) {
  const admin = createAdminClient();
  const { data: memories } = await admin
    .from("memories")
    .select("id, caption, occurred_on, milestone_kind")
    .eq("household_id", householdId)
    .order("occurred_on", { ascending: false })
    .limit(20);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Memories</CardTitle>
      </CardHeader>
      <CardContent>
        {(memories ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No memories yet.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {memories!.map((m) => (
              <li key={m.id}>
                <p className="font-medium">{m.caption ?? m.milestone_kind ?? "Memory"}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(m.occurred_on), "PPP")}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
