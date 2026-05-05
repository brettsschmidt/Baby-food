import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/queries/household";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  await requireUser(supabase);

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-md space-y-8">{children}</div>
    </main>
  );
}
