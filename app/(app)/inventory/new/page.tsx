import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createInventoryItem } from "@/lib/actions/inventory";

export default function NewInventoryItemPage() {
  return (
    <>
      <AppHeader
        title="Add item"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/inventory">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <form action={createInventoryItem} className="flex-1 space-y-4 px-4 py-4 pb-8">
        <div className="space-y-2">
          <Label htmlFor="name">What is it?</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="Sweet potato puree"
            autoComplete="off"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={6}
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
              <option value="g">grams</option>
              <option value="ml">millilitres</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="storage">Storage</Label>
            <select
              id="storage"
              name="storage"
              defaultValue="freezer"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
            >
              <option value="freezer">Freezer</option>
              <option value="fridge">Fridge</option>
              <option value="pantry">Pantry</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiry_date">Use by</Label>
            <Input id="expiry_date" name="expiry_date" type="date" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" placeholder="e.g. with cinnamon, batch from Sunday" />
        </div>
        <Button type="submit" size="lg" className="w-full">
          Save to inventory
        </Button>
      </form>
    </>
  );
}
