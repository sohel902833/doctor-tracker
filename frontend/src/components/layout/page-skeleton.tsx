import { Skeleton } from "@/components/ui/skeleton";

/** Suspense fallback for list pages. */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-full max-w-2xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
