import { Skeleton } from "@/components/ui/skeleton";

export function MenuSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-7 w-32 rounded-full" />
      <Skeleton className="mt-5 h-12 w-full max-w-lg" />
      <Skeleton className="mt-3 h-6 w-full max-w-2xl" />
      <div className="mt-12 flex gap-2 overflow-hidden">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-9 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="overflow-hidden rounded-xl border bg-card">
            <Skeleton className="aspect-[16/10] w-full rounded-none" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="mt-5 h-6 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
