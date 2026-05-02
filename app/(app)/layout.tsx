import { BottomNav } from "@/components/nav/bottom-nav";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/queries/household";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  await requireHousehold(supabase);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">{children}</div>
      <BottomNav />
    </div>
  );
}
