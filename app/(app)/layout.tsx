import { BottomNav } from "@/components/nav/bottom-nav";
import { ThemeApplier } from "@/components/theme-applier";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";
import { themeStyle } from "@/lib/theme";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const { data: household } = await supabase
    .from("households")
    .select("theme_color, accent_emoji, theme_mode")
    .eq("id", householdId)
    .maybeSingle();

  const themeMode = (household?.theme_mode ?? "system") as "light" | "dark" | "system";

  return (
    <div className="flex min-h-full flex-1 flex-col" style={themeStyle(household?.theme_color)}>
      <ThemeApplier mode={themeMode} />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">{children}</div>
      <BottomNav />
    </div>
  );
}
