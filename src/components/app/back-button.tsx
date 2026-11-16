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
    <Button
      variant="ghost"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className="h-12 gap-2 px-3 text-base text-white hover:bg-white/10 hover:text-white"
    >
      <ArrowLeft className="size-5" />
      {label}
    </Button>
  );
}
