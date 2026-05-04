import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { differenceInMinutes, format } from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { endCaregiverShift, startCaregiverShift } from "@/lib/actions/caregiver";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export default async function ShiftsPage() {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);

  const { data: shifts } = await supabase
    .from("caregiver_shifts")
    .select("id, user_id, starts_at, ends_at, profiles:user_id(display_name)")
    .eq("household_id", householdId)
    .order("starts_at", { ascending: false })
    .limit(50)
    .returns<
      {
        id: string;
        user_id: string;
        starts_at: string;
        ends_at: string | null;
        profiles: { display_name: string | null } | null;
      }[]
    >();

  const open = shifts?.find((s) => !s.ends_at);
  const iAmOnDuty = open?.user_id === userId;

  return (
    <>
      <AppHeader
        title="Caregiver shifts"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/care">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" /> On duty
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {open ? (
              <>
                <p className="text-sm">
                  <strong>{open.profiles?.display_name ?? "Member"}</strong> since{" "}
                  {format(new Date(open.starts_at), "PPP p")}
                </p>
                {iAmOnDuty && (
                  <form action={endCaregiverShift}>
                    <Button type="submit" variant="outline" className="w-full">
                      End my shift
                    </Button>
                  </form>
                )}
              </>
            ) : (
              <form action={startCaregiverShift}>
                <Button type="submit" className="w-full">
                  Start my shift
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent shifts</CardTitle>
          </CardHeader>
          <CardContent>
            {(shifts ?? []).filter((s) => s.ends_at).length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed shifts yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {shifts!
                  .filter((s) => s.ends_at)
                  .slice(0, 30)
                  .map((s) => {
                    const minutes = differenceInMinutes(
                      new Date(s.ends_at!),
                      new Date(s.starts_at),
                    );
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between border-b pb-1 last:border-0"
                      >
                        <div>
                          <p>{s.profiles?.display_name ?? "Member"}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(s.starts_at), "MMM d, h:mm a")} →{" "}
                            {format(new Date(s.ends_at!), "h:mm a")}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {Math.floor(minutes / 60)}h {minutes % 60}m
                        </Badge>
                      </li>
                    );
                  })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
