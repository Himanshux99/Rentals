import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { BadgeCheck, CalendarHeart, Layers, MapPin, Store, Users } from "lucide-react";
import { AppBar } from "@/components/app/app-bar";
import { ChipLink } from "@/components/app/chip-link";
import { AvailabilityBadge } from "@/components/app/product-card";
import { SiteFooter } from "@/components/app/site-footer";
import { mainPrice } from "@/lib/catalog";
import { env } from "@/server/env";
import { getProductByCode } from "@/server/services/catalog";
import { imageSrc, storage } from "@/server/storage";
import { ProductActions } from "./product-actions";

const load = cache((code: string) => getProductByCode(code.toUpperCase()));

async function priceLine(p: NonNullable<Awaited<ReturnType<typeof load>>>) {
  const t = await getTranslations("catalog");
  const m = mainPrice(p.design);
  if (!m) return "";
  return t(m.unit === "day" ? "perDay" : m.unit === "week" ? "perWeek" : "forSale", { amount: m.amount.toLocaleString("en-IN") });
}

// Server-rendered OG tags: WhatsApp's preview fetcher runs no JavaScript (SPEC §2, §7).
export async function generateMetadata({ params }: PageProps<"/p/[code]">): Promise<Metadata> {
  const p = await load((await params).code);
  if (!p) return {};
  const hi = (await getLocale()) === "hi";
  const title = `${hi ? p.titleHi : p.titleEn} · ${await priceLine(p)}`;
  const shop = p.design.shop;
  const description = `${shop.shopName}, ${hi ? shop.area.nameHi : shop.area.nameEn}`;
  const url = `${env.APP_URL}/p/${p.code}`;
  const og = p.images[0];
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", images: og ? [{ url: storage.publicUrl(og.ogKey), width: 1200, type: "image/jpeg" }] : [] },
  };
}

export default async function ProductPage({ params }: PageProps<"/p/[code]">) {
  const p = await load((await params).code);
  if (!p) notFound();
  const [t, locale] = await Promise.all([getTranslations("product_page"), getLocale()]);
  const hi = locale === "hi";
  const name = (o: { nameEn: string; nameHi: string }) => (hi ? o.nameHi : o.nameEn);
  const d = p.design;
  const title = hi ? p.titleHi : p.titleEn;
  const rupee = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const prices = [
    d.rentPerDay != null && [t("rentPerDay"), `${rupee(d.rentPerDay)} / ${t("din")}`],
    d.rentPerWeek != null && [t("rentPerWeek"), `${rupee(d.rentPerWeek)} / ${t("hafta")}`],
    d.sellPrice != null && [t("sellPrice"), rupee(d.sellPrice)],
    d.securityDeposit != null && [t("deposit"), rupee(d.securityDeposit)],
  ].filter((x): x is string[] => !!x);
  const facts = [
    { icon: Layers, label: t("setPieces"), value: d.setPieces.map(name).join(", ") },
    { icon: CalendarHeart, label: t("occasions"), value: d.occasions.map(name).join(", ") },
    { icon: Users, label: t("forWhom"), value: [...d.forWhom.map(name), ...d.ageRanges.map(name)].join(", ") },
  ].filter((f) => f.value);

  return (
    <>
      <AppBar />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-8 pt-2 sm:px-8 md:grid md:grid-cols-2 md:gap-10">
        {/* swipe: native horizontal scroll-snap, no gallery script */}
        <div className="-mx-4 flex snap-x snap-mandatory overflow-x-auto md:mx-0" aria-label={t("photos")}>
          {p.images.map((img, i) => (
            <div key={img.id} className="relative aspect-[3/4] w-full shrink-0 snap-center bg-muted">
              <Image src={imageSrc(img.key)} alt={i === 0 ? title : ""} fill priority={i === 0} sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              {p.images.length > 1 && (
                <span className="absolute bottom-2 right-2 bg-black/70 px-2 text-sm text-white tabular-nums">
                  {i + 1}/{p.images.length}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <AvailabilityBadge sizes={p.sizes} className="w-fit" />
            <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
            <p className="text-base text-muted-foreground tabular-nums">
              {t("code")}: {p.code}
            </p>
          </div>

          {d.products.length > 1 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">{t("colours")}</h2>
              <div className="flex flex-wrap gap-2">
                {d.products.map((s) => (
                  <ChipLink key={s.code} href={`/p/${s.code}`} active={s.code === p.code} className="px-3">
                    <span className="size-5 rounded-full border border-border" style={{ backgroundColor: s.colour.hex }} aria-hidden />
                    {name(s.colour)}
                  </ChipLink>
                ))}
              </div>
            </section>
          )}

          <dl className="grid grid-cols-2 gap-px bg-border">
            {prices.map(([k, v]) => (
              <div key={k} className="flex flex-col bg-card p-3">
                <dt className="text-sm text-muted-foreground">{k}</dt>
                <dd className="text-xl font-semibold text-[var(--haldi)]">{v}</dd>
              </div>
            ))}
          </dl>

          <ProductActions
            code={p.code}
            title={title}
            price={await priceLine(p)}
            cover={p.images[0] ? imageSrc(p.images[0].key) : null}
            url={`${env.APP_URL}/p/${p.code}`}
            whatsappPhone={d.shop.whatsappPhone}
            sizes={p.sizes.map((s) => ({ id: s.sizeId, name: name(s.size), available: s.availableCount }))}
          />

          {facts.length > 0 && (
            <ul className="flex flex-col gap-3 text-base">
              {facts.map((f) => (
                <li key={f.label} className="flex gap-3">
                  <f.icon className="size-5 shrink-0 text-[var(--haldi)]" />
                  <span>
                    <span className="text-muted-foreground">{f.label}: </span>
                    {f.value}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {d.description && <p className="whitespace-pre-line text-lg">{d.description}</p>}

          <Link href={`/shop/${d.shop.slug}`} className="flex items-center gap-3 bg-card p-4 hover:bg-accent">
            <Store className="size-8 shrink-0 text-[var(--haldi)]" />
            <span className="flex flex-col">
              <span className="flex items-center gap-1 text-lg font-semibold">
                {d.shop.shopName}
                {d.shop.isVerified && <BadgeCheck className="size-5 text-[var(--haldi)]" aria-label={t("verified")} />}
              </span>
              <span className="flex items-center gap-1 text-base text-muted-foreground">
                <MapPin className="size-4" />
                {name(d.shop.area)}
              </span>
            </span>
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
