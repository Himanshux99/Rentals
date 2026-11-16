import Image from "next/image";
import { cn } from "@/lib/utils";

/** The brand lotus with a slow pulse, for major transitions only. Static under prefers-reduced-motion. */
export function LogoLoader({ message, size = 64, className }: { message?: string; size?: number; className?: string }) {
  return (
    <div role="status" className={cn("flex flex-col items-center justify-center gap-4 py-16", className)}>
      <Image src="/brand/vastra-mark.png" alt="" width={size} height={Math.round(size * 0.59)} priority className="animate-logo-pulse motion-reduce:animate-none" />
      <p className={message ? "text-base text-muted-foreground" : "sr-only"}>{message ?? "Loading"}</p>
    </div>
  );
}
