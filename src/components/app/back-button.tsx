"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Top-level pages have nowhere to go back to.
const ROOTS = ["/", "/seller", "/admin"];

// Set once the visitor has moved between pages inside the site. Until then "back" would leave the site
// (a shared product link opened from WhatsApp or a new tab), so we go to the section's home instead.
let firstPath: string | null = null;
let movedInside = false;

export function BackButton({ label }: { label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    firstPath ??= pathname;
    if (pathname !== firstPath) movedInside = true;
  }, [pathname]);
  if (ROOTS.includes(pathname)) return null;
  const home = ROOTS.find((r) => r !== "/" && pathname.startsWith(r + "/")) ?? "/";
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-2 sm:px-8">
    <Button
      variant="ghost"
      onClick={() => (movedInside ? router.back() : router.push(home))}
      className="-ml-2.5 h-12 gap-2 px-2.5 text-base font-semibold"
    >
      <ArrowLeft className="size-5" />
      {label}
    </Button>
    </div>
  );
}
