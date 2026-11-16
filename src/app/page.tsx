import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CalendarDays, IndianRupee, MapPin, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppBar } from "@/components/app/app-bar";
import { CatalogListing } from "@/components/app/catalog-listing";
import { SiteFooter } from "@/components/app/site-footer";
import { parseFilters } from "@/lib/catalog";

export default async function Home({ searchParams }: PageProps<"/">) {
  const [t, sp] = await Promise.all([getTranslations("home"), searchParams]);
  const pillars = [
    { icon: CalendarDays, text: t("pillar1") },
    { icon: ShieldCheck, text: t("pillar2") },
    { icon: Wallet, text: t("pillar3") },
  ];
  return (
    <>
      <AppBar />
      {/* hero: pale blue with two soft curves, text left (RentWear guide §5.2) */}
      <section className="relative overflow-hidden bg-secondary">
        <div aria-hidden className="absolute -right-24 -top-32 size-96 rounded-full bg-[var(--blue-mid)]/25" />
        <div aria-hidden className="absolute -bottom-40 right-1/4 size-96 rounded-full bg-[var(--blue-mid)]/15" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 sm:px-8 sm:py-14">
          <p className="flex items-center gap-1 text-base font-medium text-muted-foreground">
            <MapPin className="size-5 text-[var(--gold)]" />
            {t("cityLabel")}
          </p>
          <h1 className="max-w-2xl font-heading text-4xl font-bold leading-tight text-[var(--navy)] sm:text-5xl">
            {t("title")}
            <span className="block font-normal italic">{t("titleAccent")}</span>
          </h1>
          <p className="max-w-xl text-lg">{t("body")}</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
            {pillars.map((p) => (
              <li key={p.text} className="flex items-center gap-2">
                <p.icon className="size-5 text-primary" aria-hidden />
                {p.text}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button nativeButton={false} render={<a href="#dresses" />} className="h-12 px-6 text-base font-semibold">
              {t("browse")}
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/sell" />} className="h-12 gap-2 border-primary bg-card px-6 text-base text-primary">
              <IndianRupee className="size-5" />
              {t("forShops")}
            </Button>
          </div>
        </div>
      </section>
      <main id="dresses" className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 pb-8 pt-8 sm:px-8">
        <CatalogListing path="/" filters={parseFilters(sp)} />
      </main>
      <SiteFooter />
    </>
  );
}
