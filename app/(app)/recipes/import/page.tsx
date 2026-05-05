import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importRecipeJson } from "@/lib/actions/recipe-extras";

const SAMPLE = JSON.stringify(
  {
    name: "Pear-banana porridge",
    description: "5 minute breakfast for 6m+",
    min_age_months: 6,
    yield_quantity: 6,
    yield_unit: "serving",
    ingredients: [
      { ingredient: "Rolled oats", quantity: "1/2 cup" },
      { ingredient: "Pear", quantity: "1 ripe" },
      { ingredient: "Banana", quantity: "1/2 small" },
    ],
    steps: "Cook oats with water. Mash fruit. Stir in.",
  },
  null,
  2,
);

export default function RecipeImportPage() {
  return (
    <>
      <AppHeader
        title="Import recipe"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/recipes">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Paste recipe JSON</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={importRecipeJson} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="json">JSON</Label>
                <Textarea
                  id="json"
                  name="json"
                  rows={14}
                  required
                  defaultValue={SAMPLE}
                  className="font-mono text-xs"
                />
              </div>
              <Button type="submit" className="w-full">
                Import recipe
              </Button>
              <p className="text-xs text-muted-foreground">
                Use the format produced by{" "}
                <code>/api/recipes/[id]/export</code> on any household.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
