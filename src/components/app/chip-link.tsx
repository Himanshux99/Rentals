import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chip } from "./chip";

/** A filter chip that is a plain link (no client JS); `active` gives it the pressed look. */
export function ChipLink({ href, active, className, children }: { href: string; active?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <Button
      variant="ghost"
      nativeButton={false}
      render={<Link href={href} scroll={false} aria-current={active ? "true" : undefined} />}
      data-pressed={active ? "" : undefined}
      className={cn(chip, "shrink-0 gap-2", className)}
    >
      {children}
    </Button>
  );
}
