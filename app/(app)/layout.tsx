import { BottomNav } from "@/components/nav/bottom-nav";
import { CommandPalette } from "@/components/keyboard/command-palette";
import { KeyboardShortcuts } from "@/components/keyboard/shortcuts";
import { ShortcutsCheatsheet } from "@/components/keyboard/shortcuts-cheatsheet";
import { PullToRefresh } from "@/components/dashboard/pull-to-refresh";
import { ThemeApplier } from "@/components/theme-applier";
import { createClient } from "@/lib/supabase/server";
import { getActiveBaby, requireHousehold } from "@/lib/queries/household";
import { themeStyle } from "@/lib/theme";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);

  const { data: household } = await supabase
    .from("households")
    .select("theme_color, accent_emoji, theme_mode")
    .eq("id", householdId)
    .maybeSingle();

  const baby = await getActiveBaby(supabase, householdId, userId);
  const accent = baby?.theme_color ?? household?.theme_color;
  const themeMode = (household?.theme_mode ?? "system") as "light" | "dark" | "system";

  return (
    <div className="flex min-h-full flex-1 flex-col" style={themeStyle(accent)}>
      <ThemeApplier mode={themeMode} />
      <KeyboardShortcuts />
      <CommandPalette />
      <ShortcutsCheatsheet />
      <PullToRefresh />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">{children}</div>
      <BottomNav />
    </div>
  );
}
