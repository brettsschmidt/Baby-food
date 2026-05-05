"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

const STORAGES = ["fridge", "freezer", "pantry"] as const;
const UNITS = ["cube", "jar", "pouch", "g", "ml", "serving"] as const;
type Storage = (typeof STORAGES)[number];
type Unit = (typeof UNITS)[number];

interface Row {
  name: string;
  quantity: number;
  unit: Unit;
  storage: Storage;
  expiry_date: string | null;
  sub_location: string | null;
  notes: string | null;
}

function parseCsv(input: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQ) {
      if (ch === '"' && input[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cur);
      out.push(row);
      row = [];
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur || row.length > 0) {
    row.push(cur);
    out.push(row);
  }
  return out.filter((r) => r.some((c) => c.trim() !== ""));
}

export async function importInventoryCsv(formData: FormData): Promise<void> {
  const csv = String(formData.get("csv") ?? "").trim();
  if (!csv) throw new Error("Paste some CSV first");

  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error("Need at least a header row and one data row");

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const required = ["name", "quantity"];
  for (const r of required) {
    if (!headers.includes(r)) throw new Error(`Missing required column: ${r}`);
  }

  const idx = (k: string) => headers.indexOf(k);
  const items: Row[] = [];
  for (const r of rows.slice(1)) {
    const name = (r[idx("name")] ?? "").trim();
    const qty = Number((r[idx("quantity")] ?? "").trim());
    if (!name || Number.isNaN(qty) || qty < 0) continue;
    const unitRaw = idx("unit") >= 0 ? r[idx("unit")].trim() : "cube";
    const storageRaw = idx("storage") >= 0 ? r[idx("storage")].trim() : "freezer";
    items.push({
      name,
      quantity: qty,
      unit: UNITS.includes(unitRaw as Unit) ? (unitRaw as Unit) : "cube",
      storage: STORAGES.includes(storageRaw as Storage) ? (storageRaw as Storage) : "freezer",
      expiry_date: idx("expiry_date") >= 0 ? r[idx("expiry_date")].trim() || null : null,
      sub_location: idx("sub_location") >= 0 ? r[idx("sub_location")].trim() || null : null,
      notes: idx("notes") >= 0 ? r[idx("notes")].trim() || null : null,
    });
  }

  if (items.length === 0) throw new Error("No valid rows found");

  await supabase.from("inventory_items").insert(
    items.map((i) => ({
      household_id: householdId,
      name: i.name,
      quantity: i.quantity,
      initial_quantity: i.quantity,
      unit: i.unit,
      storage: i.storage,
      expiry_date: i.expiry_date,
      sub_location: i.sub_location,
      notes: i.notes,
      prep_date: new Date().toISOString().slice(0, 10),
    })),
  );

  revalidatePath("/inventory");
  redirect("/inventory");
}
