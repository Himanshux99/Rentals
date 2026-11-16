"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Phase = "idle" | "run" | "done";

/** Thin top bar for client-side navigations (links, chips, load more). Waits 150ms so instant routes never flash it, and gives up after 10s. */
export function RouteProgress() {
  const [phase, setPhase] = useState<Phase>("idle");
  const url = usePathname() + "?" + useSearchParams();

  useEffect(() => {
    let delay: number | undefined;
    let cap: number | undefined;
    const start = (e: MouseEvent) => {
      // Next's <Link> calls preventDefault for in-app navigations; plain anchors do full loads with the browser's own indicator
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || !e.defaultPrevented || a.target === "_blank" || a.origin !== location.origin) return;
      if (a.pathname + a.search === location.pathname + location.search) return;
      window.clearTimeout(delay);
      window.clearTimeout(cap);
      delay = window.setTimeout(() => setPhase("run"), 150);
      cap = window.setTimeout(() => setPhase("idle"), 10_000);
    };
    document.addEventListener("click", start);
    return () => {
      document.removeEventListener("click", start);
      window.clearTimeout(delay);
      window.clearTimeout(cap);
    };
  }, []);

  // the new route rendered: finish the bar
  useEffect(() => {
    const finish = window.setTimeout(() => setPhase((p) => (p === "run" ? "done" : p)), 0);
    const hide = window.setTimeout(() => setPhase((p) => (p === "done" ? "idle" : p)), 250);
    return () => {
      window.clearTimeout(finish);
      window.clearTimeout(hide);
    };
  }, [url]);

  if (phase === "idle") return null;
  return (
    <div role="progressbar" aria-label="Loading" aria-busy className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1">
      <div className={`h-full origin-left bg-[var(--gold)] ${phase === "run" ? "animate-route-progress" : "scale-x-100 opacity-0 transition-opacity duration-200"}`} />
    </div>
  );
}
