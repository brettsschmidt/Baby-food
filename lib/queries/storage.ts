import "server-only";

import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function getStorageUsage(
  supabase: SupabaseServerClient,
  householdId: string,
): Promise<{ files: number; totalBytes: number }> {
  // List the household's prefix; sum sizes (Supabase Storage list returns size).
  const { data: list } = await supabase.storage
    .from("household-photos")
    .list(householdId, { limit: 1000 });

  let files = 0;
  let totalBytes = 0;
  // We list one level deep (per-user folders); for v1 just expand them.
  const userDirs = (list ?? []).filter((e) => e.id == null); // folders have null id
  for (const dir of userDirs) {
    const { data: inner } = await supabase.storage
      .from("household-photos")
      .list(`${householdId}/${dir.name}`, { limit: 1000 });
    for (const obj of inner ?? []) {
      if (obj.id != null) {
        files++;
        totalBytes += (obj.metadata as { size?: number } | null)?.size ?? 0;
      }
    }
  }
  return { files, totalBytes };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
