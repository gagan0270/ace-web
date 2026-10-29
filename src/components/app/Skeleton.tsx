import { cn } from "@/lib/utils";

/**
 * Glass-styled shimmer skeleton block. Matches the app's iOS-glass surfaces
 * so drill-down transitions never look frozen.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-[oklch(0.94_0.006_260)] hairline",
        className,
      )}
    />
  );
}

/** Card-shaped skeleton matching the Class / Section / Attendance tiles. */
export function SkeletonCard() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between">
        <div className="h-11 w-11 rounded-2xl bg-secondary hairline animate-pulse" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-3.5 w-24" />
      </div>
      <div className="mt-6 flex items-center justify-between">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
    </div>
  );
}

/** Grid of skeleton cards used while a drill-down view is loading. */
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Row-shaped skeleton for lists (student roster, attendance marks, etc.). */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/60 border-t hairline">
      <div className="h-9 w-9 rounded-2xl bg-secondary hairline animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-7 w-28 rounded-full" />
    </div>
  );
}

/** Section-heavy skeleton used for the Student Profile page. */
export function SkeletonProfile() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="glass-panel p-6 space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </div>
      <div className="glass-panel p-6 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}
