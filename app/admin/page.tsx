import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBytes } from "@/lib/queries/storage";

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const allowed = adminEmails();
  if (!user.email || !allowed.has(user.email.toLowerCase())) {
    redirect("/dashboard");
  }

  // Use the service-role client for cross-household stats.
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          SUPABASE_SERVICE_ROLE_KEY is not configured; admin stats unavailable.
        </p>
      </main>
    );
  }

  const [
    { count: householdCount },
    { count: profileCount },
    { count: feedingCount },
    { count: pushCount },
    { data: lastErrors },
  ] = await Promise.all([
    admin.from("households").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("feedings").select("*", { count: "exact", head: true }).is("archived_at", null),
    admin.from("push_subscriptions").select("*", { count: "exact", head: true }),
    admin
      .from("activity_log")
      .select("kind, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Households" value={householdCount ?? 0} />
        <Stat label="Profiles" value={profileCount ?? 0} />
        <Stat label="Active feedings" value={feedingCount ?? 0} />
        <Stat label="Push subs" value={pushCount ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity (all households)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {(lastErrors ?? []).map((r, i) => (
              <li key={i} className="border-b pb-1 last:border-0">
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(r.created_at).toISOString().slice(0, 16).replace("T", " ")}
                </span>{" "}
                <strong>{r.kind}</strong>
                {r.summary && <span className="text-muted-foreground"> · {r.summary}</span>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Storage size estimates require a separate scan; shown as {formatBytes(0)} in this stub.
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
