import { ProductDetailSkeleton } from "@/components/feedback/skeletons";

export default function Loading() {
  return (
    <>
      <div className="h-16 bg-[var(--navy)]" />
      <main role="status" aria-busy className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 sm:px-8">
        <span className="sr-only">Loading</span>
        <ProductDetailSkeleton />
      </main>
    </>
  );
}
