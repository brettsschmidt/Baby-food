import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createHousehold } from "@/lib/actions/household";

export default function CreateHouseholdPage() {
  return (
    <>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Name your household</h1>
        <p className="text-sm text-muted-foreground">
          Pick something you&apos;ll recognise — &ldquo;The Smith Family&rdquo; works.
        </p>
      </div>
      <form action={createHousehold} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Household name</Label>
          <Input id="name" name="name" required autoFocus placeholder="The Smith Family" />
        </div>
        <Button type="submit" size="lg" className="w-full">
          Continue
        </Button>
      </form>
    </>
  );
}
