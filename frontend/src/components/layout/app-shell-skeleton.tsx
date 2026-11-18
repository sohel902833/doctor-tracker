import { HeartPulse } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/** Shown while the session loads; matches the real layout to avoid jumps. */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar p-3 md:block">
        <div className="flex items-center gap-2 p-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartPulse className="size-4" />
          </div>
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="mt-6 space-y-3 px-2">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      </aside>
      <main className="flex-1 space-y-6 p-4 md:p-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-80 w-full" />
      </main>
    </div>
  );
}
