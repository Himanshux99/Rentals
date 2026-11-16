import { Skeleton } from "@/components/ui/skeleton";

/** Same shell and proportions as ProductCard, so nothing jumps when the real grid arrives. */
export function ProductCardSkeleton() {
  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-card p-2 shadow-[var(--shadow-card)]">
      <Skeleton className="aspect-[4/5] rounded-xl" />
      <div className="flex flex-col gap-2 px-2">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-3/5" />
      </div>
      <Skeleton className="mt-1 h-12 rounded-xl" />
    </li>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul aria-hidden className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </ul>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div aria-hidden className="grid gap-6 md:grid-cols-2">
      <Skeleton className="aspect-square" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-7 w-1/3" />
        <Skeleton className="h-5 w-1/2" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-16" />
          ))}
        </div>
        <Skeleton className="h-14" />
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </div>
    </div>
  );
}
