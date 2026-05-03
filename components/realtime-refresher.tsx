"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type TableName =
  | "feedings"
  | "feeding_items"
  | "inventory_items"
  | "inventory_movements"
  | "shopping_list_items"
  | "activity_log"
  | "recipes";

/**
 * Subscribes to Postgres changes on the given tables for the current
 * household and calls router.refresh() so the RSC page re-fetches.
 *
 * RLS still applies to the realtime channel — subscribers only receive
 * rows they're authorised to read.
 */
export function RealtimeRefresher({
  tables,
  householdId,
}: {
  tables: TableName[];
  householdId: string;
}) {
  const router = useRouter();
  const key = tables.join(",");

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`household:${householdId}`);

    for (const table of key.split(",") as TableName[]) {
      channel.on(
        "postgres_changes",
        // Realtime filters are server-side; child tables don't carry
        // household_id directly, so we listen to all events on them and
        // rely on RLS to filter rows we're allowed to see.
        table === "feeding_items" || table === "inventory_movements"
          ? { event: "*", schema: "public", table }
          : { event: "*", schema: "public", table, filter: `household_id=eq.${householdId}` },
        () => router.refresh(),
      );
    }

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [key, householdId, router]);

  return null;
}
