import { MailCheck } from "lucide-react";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MailCheck className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          {email ? (
            <>We sent a magic link to <strong>{email}</strong>.</>
          ) : (
            <>We sent you a magic link.</>
          )}{" "}
          Tap it on this device to sign in.
        </p>
      </div>
    </div>
  );
}
