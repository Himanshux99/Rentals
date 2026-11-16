import { cn } from "@/lib/utils";

// A quiet pale-blue band that opens a screen; the RentWear system has no other ornament.
export function Stripe({ className }: { className?: string; bars?: number }) {
  return <div aria-hidden className={cn("h-2 w-full rounded-full bg-secondary", className)} />;
}
