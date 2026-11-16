import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const STATIC_PAGES = ["about", "how-it-works", "for-shops", "terms", "privacy"] as const;

const GROUPS = [STATIC_PAGES.slice(0, 3), STATIC_PAGES.slice(3)];

export async function SiteFooter() {
  const [t, home, common] = await Promise.all([getTranslations("pages"), getTranslations("home"), getTranslations("common")]);
  return (
    <footer className="mt-16 bg-[var(--navy)] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-10 pb-6 sm:px-8 md:grid-cols-[1.5fr_1fr] md:gap-12">
        <div className="flex flex-col items-start gap-4">
          <Link href="/" aria-label={common("appName")} className="inline-flex h-12 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/vastra-logo.png" alt="" width={124} height={32} className="h-8 w-auto brightness-0 invert" />
          </Link>
          <p className="max-w-sm text-base text-white/80">{home("body")}</p>
          <Button variant="outline" nativeButton={false} render={<Link href="/sell" />} className="h-12 gap-2 border-white/40 bg-transparent px-5 text-base text-white hover:bg-white/10 hover:text-white">
            <IndianRupee className="size-5" />
            {home("forShops")}
          </Button>
        </div>
        <nav className="grid grid-cols-2 gap-x-6">
          {GROUPS.map((group, i) => (
            <ul key={i} className="flex flex-col">
              {group.map((p) => (
                <li key={p}>
                  <Link href={`/${p}`} className="inline-flex h-12 items-center text-base text-white/85 underline-offset-4 hover:text-white hover:underline">
                    {t(`${p}.title`)}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <Separator className="bg-white/20" />
        <p className="py-5 text-sm text-white/70">
          © {new Date().getFullYear()} {common("appName")} · {common("city")}
        </p>
      </div>
    </footer>
  );
}
