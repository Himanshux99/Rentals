import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const STATIC_PAGES = ["about", "how-it-works", "for-shops", "terms", "privacy"] as const;

export async function SiteFooter() {
  const t = await getTranslations("pages");
  return (
    <footer className="mt-16 bg-[var(--navy)] text-white">
      <nav className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-1 px-4 py-6 sm:px-8">
        {STATIC_PAGES.map((p) => (
          <Link key={p} href={`/${p}`} className="inline-flex h-12 min-w-12 items-center justify-center text-base text-white/85 underline-offset-4 hover:text-white hover:underline">
            {t(`${p}.title`)}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
