import Link from "next/link";

export function AppHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur safe-top">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-3 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold">
          <span className="text-lg">🥕</span>
          <span>{title}</span>
        </Link>
        {action}
      </div>
    </header>
  );
}
