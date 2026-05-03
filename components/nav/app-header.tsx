import Link from "next/link";
import { Settings } from "lucide-react";

import { BabySwitcher } from "@/components/babies/baby-switcher";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getBabies, getActiveBaby, requireHousehold } from "@/lib/queries/household";

export async function AppHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  const supabase = await createClient();
  const { householdId, userId } = await requireHousehold(supabase);
  const [babies, active] = await Promise.all([
    getBabies(supabase, householdId),
    getActiveBaby(supabase, householdId, userId),
  ]);

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur safe-top">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold">
          <span className="text-lg">🥕</span>
          <span>{title}</span>
        </Link>
        <div className="flex items-center gap-1">
          {babies.length > 1 && active && (
            <BabySwitcher babies={babies} activeId={active.id} />
          )}
          {action}
          <Button asChild size="icon" variant="ghost">
            <Link href="/settings" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
