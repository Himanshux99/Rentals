import Link from "next/link";
import { Shirt } from "lucide-react";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight text-white">
      <Shirt className="size-6 text-[var(--gold)]" aria-hidden />
      Rentals
    </Link>
  );
}
