import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importFeedingsCsv } from "@/lib/actions/feedings-bulk";

const SAMPLE = `fed_at,food,mood
2026-04-12T08:30:00,Banana porridge,loved
2026-04-12T12:15:00,Sweet potato puree,liked
2026-04-12T18:00:00,Pea cubes,refused`;

export default function ImportFeedingsPage() {
  return (
    <>
      <AppHeader
        title="Import feedings"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/feedings">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bulk-import past feedings</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={importFeedingsCsv} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="csv">CSV (with a header row)</Label>
                <Textarea
                  id="csv"
                  name="csv"
                  rows={10}
                  required
                  defaultValue={SAMPLE}
                  className="font-mono text-xs"
                />
              </div>
              <Button type="submit" className="w-full">
                Import feedings
              </Button>
              <p className="text-xs text-muted-foreground">
                Required column: <code>fed_at</code> (ISO 8601). Optional:{" "}
                <code>food</code>, <code>mood</code>.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
