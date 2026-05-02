import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingChoicePage() {
  return (
    <>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Set up your household</h1>
        <p className="text-sm text-muted-foreground">
          Both parents share one household so meals and inventory stay in sync.
        </p>
      </div>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Start fresh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Create a new household and invite your partner.
            </p>
            <Button asChild className="w-full">
              <Link href="/onboarding/create">Create household</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Join existing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Got an invite code from your partner? Join their household.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/onboarding/join">Enter invite code</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
