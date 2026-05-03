import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoField } from "@/components/photo/photo-field";
import { UrlImporter } from "@/components/recipes/url-importer";
import { createRecipe } from "@/lib/actions/recipes";

export default function NewRecipePage() {
  return (
    <>
      <AppHeader
        title="New recipe"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/recipes">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <form action={createRecipe} className="flex-1 space-y-4 px-4 py-4 pb-8">
        <UrlImporter />
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required autoFocus />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Short description</Label>
          <Input id="description" name="description" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="min_age_months">Min age (months)</Label>
            <Input id="min_age_months" name="min_age_months" type="number" min="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prep_minutes">Prep time (min)</Label>
            <Input id="prep_minutes" name="prep_minutes" type="number" min="0" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="yield_quantity">Yield</Label>
            <Input id="yield_quantity" name="yield_quantity" type="number" min="0" defaultValue={12} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yield_unit">Unit</Label>
            <select
              id="yield_unit"
              name="yield_unit"
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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="storage_default">Stored in</Label>
            <select
              id="storage_default"
              name="storage_default"
              defaultValue="freezer"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
            >
              <option value="freezer">Freezer</option>
              <option value="fridge">Fridge</option>
              <option value="pantry">Pantry</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_expiry_days">Keeps for (days)</Label>
            <Input id="default_expiry_days" name="default_expiry_days" type="number" min="1" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ingredients">Ingredients (one per line)</Label>
          <Textarea
            id="ingredients"
            name="ingredients"
            rows={5}
            placeholder="2 sweet potatoes&#10;1 tbsp olive oil&#10;Pinch of cinnamon"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="steps">Steps</Label>
          <Textarea id="steps" name="steps" rows={6} placeholder="Roast at 200°C for 40 min…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source_url">Source URL</Label>
          <Input id="source_url" name="source_url" type="url" placeholder="https://" />
        </div>
        <PhotoField name="photo_path" label="Photo (optional)" />
        <Button type="submit" size="lg" className="w-full">
          Save recipe
        </Button>
      </form>
    </>
  );
}
