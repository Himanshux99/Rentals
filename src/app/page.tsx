import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { MapPin, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppBar } from "@/components/app/app-bar";
import { CatalogListing } from "@/components/app/catalog-listing";
import { SiteFooter } from "@/components/app/site-footer";
import { parseFilters } from "@/lib/catalog";

export default async function Home({ searchParams }: PageProps<"/">) {
  const [t, sp] = await Promise.all([getTranslations("home"), searchParams]);
  return (
    <>
      <AppBar />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-2 sm:px-8">
        <div className="flex flex-col gap-1">
          {/* one city for now; the selector stays visible per SPEC §7 */}
          <p className="flex items-center gap-1 text-base">
            <MapPin className="size-5 text-[var(--haldi)]" />
            {t("cityLabel")}
          </p>
          <h1 className="text-3xl font-semibold sm:text-5xl">{t("title")}</h1>
          <p className="text-lg">{t("body")}</p>
          <Button variant="outline" nativeButton={false} render={<Link href="/sell" />} className="mt-2 h-12 w-fit gap-2 text-base">
            <Store className="size-5" />
            {t("forShops")}
          </Button>
        </div>
        <CatalogListing path="/" filters={parseFilters(sp)} />
      </main>
      <SiteFooter />
    </>
  );
}
