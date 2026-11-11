import Link from "next/link";

// Mark: three tent stripes in a square, then the name.
export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 font-heading text-xl font-semibold tracking-tight">
      <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
        <rect width="24" height="24" fill="var(--haldi)" />
        <rect x="4" width="4" height="24" fill="var(--tobacco)" />
        <rect x="12" width="4" height="24" fill="var(--tobacco)" />
        <rect x="20" width="4" height="24" fill="var(--tobacco)" />
      </svg>
      Rentals
    </Link>
  );
}
