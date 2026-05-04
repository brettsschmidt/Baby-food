import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/nav/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KitchenTimer } from "@/components/timer/kitchen-timer";

export default function TimerPage() {
  return (
    <>
      <AppHeader
        title="Kitchen timer"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 px-4 py-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick presets</CardTitle>
          </CardHeader>
          <CardContent>
            <KitchenTimer />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
