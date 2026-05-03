import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur safe-top">
        <div className="flex h-14 items-center justify-between px-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <div className="flex-1 space-y-3 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
