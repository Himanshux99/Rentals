import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Stripe } from "./stripe";

export const STATIC_PAGES = ["about", "how-it-works", "for-shops", "terms", "privacy"] as const;

export async function SiteFooter() {
  const t = await getTranslations("pages");
  return (
    <footer className="mt-auto flex flex-col gap-4 pt-12">
      <Stripe className="h-3" bars={48} />
      <nav className="flex flex-wrap gap-x-6 gap-y-1 px-4 pb-8 sm:px-8">
        {STATIC_PAGES.map((p) => (
          <Link key={p} href={`/${p}`} className="inline-flex h-12 items-center text-base underline-offset-4 hover:underline">
            {t(`${p}.title`)}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
