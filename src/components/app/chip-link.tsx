import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chip } from "./chip";

/** A filter chip that is a plain link (no client JS); `active` gives it the pressed look. Uses buttonVariants on a Link so it stays a server component, unlike the Base UI Button which hydrates once per chip. */
export function ChipLink({ href, active, className, children }: { href: string; active?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      data-slot="button"
      data-pressed={active ? "" : undefined}
      className={cn(buttonVariants({ variant: "ghost" }), chip, "shrink-0 gap-2 data-[pressed]:hover:bg-primary/90", className)}
    >
      {children}
    </Link>
  );
}
