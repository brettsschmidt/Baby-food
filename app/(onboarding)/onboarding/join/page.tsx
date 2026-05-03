import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redeemInvite } from "@/lib/actions/household";

export default async function JoinHouseholdPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return (
    <>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Join with a code</h1>
        <p className="text-sm text-muted-foreground">
          Ask your partner for the 8-character invite code.
        </p>
      </div>
      <form action={redeemInvite} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Invite code</Label>
          <Input
            id="code"
            name="code"
            required
            autoFocus
            defaultValue={code}
            placeholder="K7H2-9XMP"
            autoCapitalize="characters"
            className="font-mono uppercase tracking-widest text-center text-lg"
          />
        </div>
        <Button type="submit" size="lg" className="w-full">
          Join household
        </Button>
      </form>
    </>
  );
}
