import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importInventoryCsv } from "@/lib/actions/inventory-import";

const SAMPLE = `name,quantity,unit,storage,expiry_date,sub_location,notes
Sweet potato puree,8,cube,freezer,2026-07-01,drawer 1,Sunday batch
Apple sauce,4,jar,fridge,,,Opened`;

export default function ImportPage() {
  return (
    <>
      <AppHeader
        title="Bulk import"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/inventory">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CSV import</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={importInventoryCsv} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="csv">Paste CSV</Label>
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
                Import rows
              </Button>
              <p className="text-xs text-muted-foreground">
                Required columns: <code>name</code>, <code>quantity</code>. Optional:{" "}
                <code>unit</code>, <code>storage</code>, <code>expiry_date</code>,{" "}
                <code>sub_location</code>, <code>notes</code>.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
