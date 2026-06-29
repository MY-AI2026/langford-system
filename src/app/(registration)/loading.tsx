import { Skeleton } from "@/components/ui/skeleton";

/** Instant Suspense fallback for the Acceptix registration routes. */
export default function RegistrationLoading() {
  return (
    <div className="animate-page-in space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
