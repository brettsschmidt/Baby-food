import { differenceInCalendarDays, format } from "date-fns";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { Sparkline } from "@/components/growth/sparkline";
import { deleteGrowth, logGrowth } from "@/lib/actions/growth";
import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";

export default async function GrowthPage() {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const baby = await getActiveBaby(supabase, householdId, userId);

  if (!baby) {
    return (
      <>
        <AppHeader title="Growth" />
        <div className="flex-1 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Add a baby first.</p>
        </div>
      </>
    );
  }

  const { data: measures } = await supabase
    .from("growth_measurements")
    .select("id, measured_on, weight_kg, length_cm, head_cm, notes")
    .eq("baby_id", baby.id)
    .order("measured_on", { ascending: true });

  const birth = new Date(baby.birth_date);
  const dayOf = (d: string) => differenceInCalendarDays(new Date(d), birth);
  const weightPoints =
    measures?.filter((m) => m.weight_kg != null).map((m) => ({ x: dayOf(m.measured_on), y: Number(m.weight_kg) })) ?? [];
  const lengthPoints =
    measures?.filter((m) => m.length_cm != null).map((m) => ({ x: dayOf(m.measured_on), y: Number(m.length_cm) })) ?? [];
  const headPoints =
    measures?.filter((m) => m.head_cm != null).map((m) => ({ x: dayOf(m.measured_on), y: Number(m.head_cm) })) ?? [];

  return (
    <>
      <RealtimeRefresher tables={["growth_measurements"]} householdId={householdId} />
      <AppHeader title="Growth" />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <Card>
          <CardContent className="space-y-4 pt-4">
            <Sparkline points={weightPoints} label="Weight" unit="kg" metric="weight_kg" />
            <Sparkline points={lengthPoints} label="Length" unit="cm" metric="length_cm" />
            <Sparkline points={headPoints} label="Head" unit="cm" metric="head_cm" />
            <p className="text-[10px] text-muted-foreground">
              Dashed lines: WHO 3rd / 15th / 85th / 97th percentile bands. Solid grey: median.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add measurement</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={logGrowth} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="measured_on">Date</Label>
                <Input
                  id="measured_on"
                  name="measured_on"
                  type="date"
                  defaultValue={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="weight_kg" className="text-xs">
                    Weight (kg)
                  </Label>
                  <Input id="weight_kg" name="weight_kg" type="number" step="0.01" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="length_cm" className="text-xs">
                    Length (cm)
                  </Label>
                  <Input id="length_cm" name="length_cm" type="number" step="0.1" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="head_cm" className="text-xs">
                    Head (cm)
                  </Label>
                  <Input id="head_cm" name="head_cm" type="number" step="0.1" />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Save
              </Button>
            </form>
          </CardContent>
        </Card>

        {measures && measures.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">History</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {measures
                  .slice()
                  .reverse()
                  .map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between rounded-md border bg-card/50 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium">{format(new Date(m.measured_on), "MMM d, yyyy")}</p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            m.weight_kg != null && `${m.weight_kg} kg`,
                            m.length_cm != null && `${m.length_cm} cm`,
                            m.head_cm != null && `head ${m.head_cm} cm`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <form action={deleteGrowth}>
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          type="submit"
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          Remove
                        </button>
                      </form>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
