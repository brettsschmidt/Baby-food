import Link from "next/link";
import { BookOpen, Heart, Package, Search } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

const ICONS = {
  food: Package,
  recipe: BookOpen,
  memory: Heart,
} as const;

const HREFS = {
  food: () => "/library",
  recipe: (id: string) => `/recipes/${id}`,
  memory: () => "/memories",
} as const;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  type Hit = {
    kind: "food" | "recipe" | "memory";
    id: string;
    label: string;
    sublabel: string;
    score: number;
  };

  const { data: hits } =
    query.length >= 2
      ? await supabase
          .rpc("search_household", { p_household_id: householdId, p_query: query })
          .returns<Hit[]>()
      : { data: [] };

  return (
    <>
      <AppHeader title="Search" />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <form action="/search" method="GET">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              name="q"
              placeholder="Search foods, recipes, memories…"
              defaultValue={query}
              autoFocus
              className="pl-9"
            />
          </div>
        </form>

        {query.length < 2 ? (
          <p className="text-sm text-muted-foreground">Type at least 2 characters.</p>
        ) : (hits ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No matches for &ldquo;{query}&rdquo;.</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {(hits ?? []).map((h) => {
                  const Icon = ICONS[h.kind];
                  const href = HREFS[h.kind](h.id);
                  return (
                    <li key={`${h.kind}-${h.id}`}>
                      <Link
                        href={href}
                        className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/40"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{h.label}</p>
                          {h.sublabel && (
                            <p className="truncate text-xs text-muted-foreground">{h.sublabel}</p>
                          )}
                        </div>
                        <span className="text-[10px] uppercase text-muted-foreground">{h.kind}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
