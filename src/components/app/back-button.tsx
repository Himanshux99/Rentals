"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Top-level pages have nowhere to go back to.
const ROOTS = ["/", "/seller", "/admin"];

export function BackButton({ label }: { label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  if (ROOTS.includes(pathname)) return null;
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-2 sm:px-8">
    <Button
      variant="ghost"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className="-ml-2.5 h-12 gap-2 px-2.5 text-base font-semibold"
    >
      <ArrowLeft className="size-5" />
      {label}
    </Button>
    </div>
  );
}
