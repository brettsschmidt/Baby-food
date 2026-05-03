import { BottomNav } from "@/components/nav/bottom-nav";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";
import { themeStyle } from "@/lib/theme";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { householdId } = await requireHousehold(supabase);

  const { data: household } = await supabase
    .from("households")
    .select("theme_color, accent_emoji")
    .eq("id", householdId)
    .maybeSingle();

  return (
    <div className="flex min-h-full flex-1 flex-col" style={themeStyle(household?.theme_color)}>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">{children}</div>
      <BottomNav />
    </div>
  );
}
