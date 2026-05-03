import Link from "next/link";
import { ArrowLeft, FolderPlus, Globe } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCollection, importCollection } from "@/lib/actions/collections";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export default async function CollectionsPage() {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const [{ data: own }, { data: templates }] = await Promise.all([
    supabase
      .from("recipe_collections")
      .select("id, name, description, is_public_template, recipe_collection_items(recipe_id)")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false }),
    supabase
      .from("recipe_collections")
      .select("id, name, description, recipe_collection_items(recipe_id)")
      .eq("is_public_template", true)
      .neq("household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <>
      <AppHeader
        title="Collections"
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
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderPlus className="h-4 w-4 text-primary" /> New collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createCollection} className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={2} />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" name="is_public_template" />
                Share as a public template (other households can copy)
              </label>
              <Button type="submit" className="w-full">
                Create collection
              </Button>
            </form>
          </CardContent>
        </Card>

        {(own ?? []).length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              My collections
            </h2>
            <ul className="space-y-2">
              {own!.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/recipes/collections/${c.id}`}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.recipe_collection_items?.length ?? 0} recipes
                        {c.is_public_template ? " · public template" : ""}
                      </p>
                    </div>
                    {c.is_public_template && (
                      <Badge variant="secondary" className="gap-1">
                        <Globe className="h-3 w-3" /> Public
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(templates ?? []).length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Public templates
            </h2>
            <ul className="space-y-2">
              {templates!.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-3 rounded-lg border bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.recipe_collection_items?.length ?? 0} recipes
                    </p>
                  </div>
                  <form action={importCollection}>
                    <input type="hidden" name="collection_id" value={t.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Add to my recipes
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
