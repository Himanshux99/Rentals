import Link from "next/link";
import { getTranslations } from "next-intl/server";

// Lotus alone on phones (room for the bar's icons), lotus and name from sm up.
export async function Wordmark({ href = "/" }: { href?: string }) {
  const t = await getTranslations("common");
  return (
    <Link href={href} className="inline-flex h-12 shrink-0 items-center" aria-label={t("appName")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/vastra-mark.png" alt="" height={24} className="h-6 w-auto brightness-0 invert sm:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/vastra-logo.png" alt="" height={32} className="hidden h-8 w-auto brightness-0 invert sm:block" />
    </Link>
  );
}
