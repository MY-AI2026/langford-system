import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading UI for every dashboard page. Next renders this instantly
 * as the Suspense fallback while the target route's data/components stream in,
 * so navigation feels immediate instead of showing a blank screen.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-page-in space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>

      {/* Content blocks */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  );
}
