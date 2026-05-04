import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ForceRefresh } from "@/components/admin/force-refresh";
import { clearErrorLogs, clearTimingLogs } from "@/lib/actions/admin";
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
    { count: errorCount },
    { data: lastActivity },
    { data: errors },
  ] = await Promise.all([
    admin.from("households").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("feedings").select("*", { count: "exact", head: true }).is("archived_at", null),
    admin.from("push_subscriptions").select("*", { count: "exact", head: true }),
    admin
      .from("error_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(new Date().getTime() - 24 * 3600 * 1000).toISOString()),
    admin
      .from("activity_log")
      .select("kind, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("error_logs")
      .select("id, surface, message, url, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Households" value={householdCount ?? 0} />
        <Stat label="Profiles" value={profileCount ?? 0} />
        <Stat label="Active feedings" value={feedingCount ?? 0} />
        <Stat label="Push subs" value={pushCount ?? 0} />
        <Stat label="Errors (24h)" value={errorCount ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent errors</CardTitle>
        </CardHeader>
        <CardContent>
          {(errors ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No errors recorded.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {(errors ?? []).map((e) => (
                <li key={e.id} className="border-b pb-1 last:border-0">
                  <span className="font-mono text-xs text-muted-foreground">
                    {new Date(e.created_at).toISOString().slice(0, 16).replace("T", " ")}
                  </span>{" "}
                  <strong>[{e.surface}]</strong> {e.message}
                  {e.url && <span className="block text-xs text-muted-foreground">{e.url}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity (all households)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {(lastActivity ?? []).map((r, i) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <ForceRefresh />
          <form action={clearErrorLogs}>
            <Button type="submit" size="sm" variant="outline" className="text-destructive">
              Clear error logs
            </Button>
          </form>
          <form action={clearTimingLogs}>
            <Button type="submit" size="sm" variant="outline" className="text-destructive">
              Clear timing logs
            </Button>
          </form>
          <Button asChild size="sm" variant="outline">
            <a href="/api/health" target="_blank" rel="noreferrer">
              Health check
            </a>
          </Button>
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
