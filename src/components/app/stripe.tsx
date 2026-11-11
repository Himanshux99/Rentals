import { cn } from "@/lib/utils";

// The shamiyana stripe: the striped wedding-tent cloth, used as the product's one ornament.
export function Stripe({ className, bars = 24 }: { className?: string; bars?: number }) {
  return (
    <div aria-hidden className={cn("flex h-10 w-full overflow-hidden", className)}>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className={cn("h-full flex-1", i % 2 ? "bg-[var(--tobacco)]" : "bg-[var(--haldi)]")} />
      ))}
    </div>
  );
}
