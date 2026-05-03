import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPrepPlan } from "@/lib/actions/planner";

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default async function NewPrepPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ food_name?: string }>;
}) {
  const { food_name } = await searchParams;
  return (
    <>
      <AppHeader
        title="Plan a prep"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/planner">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <form action={createPrepPlan} className="flex-1 space-y-4 px-4 py-4 pb-8">
        <div className="space-y-2">
          <Label htmlFor="food_name">What are you making?</Label>
          <Input
            id="food_name"
            name="food_name"
            required
            autoFocus
            defaultValue={food_name ?? ""}
            placeholder="Sweet potato puree"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="planned_quantity">Aim for</Label>
            <Input
              id="planned_quantity"
              name="planned_quantity"
              type="number"
              min="1"
              defaultValue={12}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <select
              id="unit"
              name="unit"
              defaultValue="cube"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
            >
              <option value="cube">cubes</option>
              <option value="jar">jars</option>
              <option value="pouch">pouches</option>
              <option value="serving">servings</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="scheduled_for">When</Label>
          <Input
            id="scheduled_for"
            name="scheduled_for"
            type="date"
            defaultValue={tomorrow()}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" placeholder="Recipe link, ingredients to buy…" />
        </div>
        <Button type="submit" size="lg" className="w-full">
          Schedule prep
        </Button>
      </form>
    </>
  );
}
