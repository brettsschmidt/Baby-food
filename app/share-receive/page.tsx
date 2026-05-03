import Link from "next/link";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareReceiveForms } from "@/components/share/share-receive-forms";
import { requireHousehold } from "@/lib/queries/household";
import { createClient } from "@/lib/supabase/server";

export default async function ShareReceivePage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; text?: string; url?: string }>;
}) {
  const { title, text, url } = await searchParams;
  const supabase = await createClient();
  await requireHousehold(supabase);

  const initialText = [title, text, url].filter(Boolean).join("\n");

  return (
    <>
      <AppHeader title="Save shared" />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What should we save this as?</CardTitle>
          </CardHeader>
          <CardContent>
            <ShareReceiveForms initialText={initialText} initialUrl={url ?? ""} />
          </CardContent>
        </Card>
        <Button asChild variant="ghost" className="w-full">
          <Link href="/dashboard">Cancel</Link>
        </Button>
      </div>
    </>
  );
}
