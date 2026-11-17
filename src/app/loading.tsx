import { CatalogSkeleton } from "@/components/feedback/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Home-shaped: app bar, hero block, then the catalog. (Other routes without their own loading.tsx fall back here.) */
export default function Loading() {
  return (
    <>
      <div className="h-16 bg-[var(--navy)]" />
      <div role="status" aria-busy className="bg-secondary">
        <span className="sr-only">Loading</span>
        <div aria-hidden className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 sm:px-8 sm:py-14">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-4/5 max-w-2xl sm:h-12" />
          <Skeleton className="h-10 w-3/5 max-w-xl sm:h-12" />
          <Skeleton className="h-6 w-full max-w-xl" />
          <Skeleton className="h-6 w-2/3 max-w-md" />
          <div className="flex gap-6">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-12 w-48" />
          </div>
        </div>
      </div>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8 pt-8 sm:px-8">
        <CatalogSkeleton />
      </main>
    </>
  );
}
