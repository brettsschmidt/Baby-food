import { notFound } from "next/navigation";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";
import { PrintTrigger } from "@/app/print/report/print-trigger";

export const dynamic = "force-dynamic";

export default async function LabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const { data: item } = await supabase
    .from("inventory_items")
    .select("id, name, prep_date, expiry_date, unit, storage")
    .eq("id", id)
    .eq("household_id", householdId)
    .maybeSingle();

  if (!item) notFound();

  const labels = Array.from({ length: 8 }, (_, i) => i);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-semibold">Print labels: {item.name}</h1>
        <div className="flex gap-2">
          <PrintTrigger />
          <Button asChild variant="outline" size="sm">
            <a href={`/inventory/${item.id}`}>Back</a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 print:gap-0">
        {labels.map((i) => (
          <div
            key={i}
            className="break-inside-avoid rounded-md border-2 border-dashed p-3 print:border-solid"
          >
            <p className="truncate text-sm font-bold">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              {item.storage} · {item.unit}
            </p>
            <p className="mt-2 text-xs">
              Prepped: <strong>{item.prep_date ? format(new Date(item.prep_date), "MMM d, yyyy") : "—"}</strong>
            </p>
            <p className="text-xs">
              Use by:{" "}
              <strong>
                {item.expiry_date ? format(new Date(item.expiry_date), "MMM d, yyyy") : "—"}
              </strong>
            </p>
            <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">
              {item.id.slice(0, 8)}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground print:hidden">
        Print on a sticker sheet, or trim the dashed boxes. Eight labels per page.
      </p>
    </main>
  );
}
