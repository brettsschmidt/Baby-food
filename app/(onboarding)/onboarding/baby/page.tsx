import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addBaby } from "@/lib/actions/household";

export default function AddBabyPage() {
  return (
    <>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Tell us about your baby</h1>
        <p className="text-sm text-muted-foreground">
          We use the birth date to suggest age-appropriate foods.
        </p>
      </div>
      <form action={addBaby} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Baby&apos;s name</Label>
          <Input id="name" name="name" required autoFocus />
        </div>
        <div className="space-y-2">
          <Label htmlFor="birth_date">Birth date</Label>
          <Input id="birth_date" name="birth_date" type="date" required />
        </div>
        <Button type="submit" size="lg" className="w-full">
          Finish setup
        </Button>
      </form>
    </>
  );
}
