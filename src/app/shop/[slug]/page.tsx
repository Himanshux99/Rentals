import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { BadgeCheck, MapPin, MessageCircle, Navigation, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppBar } from "@/components/app/app-bar";
import { CatalogListing } from "@/components/app/catalog-listing";
import { SiteFooter } from "@/components/app/site-footer";
import { parseFilters, waLink, waShare } from "@/lib/catalog";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { getShopBySlug, visibleProduct } from "@/server/services/catalog";
import { imageSrc, storage } from "@/server/storage";

const load = cache(getShopBySlug);

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const shop = await load((await params).slug);
  if (!shop) return {};
  const hi = (await getLocale()) === "hi";
  const url = `${env.APP_URL}/shop/${shop.slug}`;
  // shop photo (already a JPEG), else the cover of the shop's newest dress
  let ogKey = shop.shopPhotoKey;
  if (!ogKey) {
    const first = await db.productImage.findFirst({
      where: { product: { ...visibleProduct, design: { shopId: shop.id } } },
      orderBy: [{ product: { createdAt: "desc" } }, { sortOrder: "asc" }],
    });
    ogKey = first?.ogKey ?? null;
  }
  const description = `${hi ? shop.area.nameHi : shop.area.nameEn}, ${hi ? shop.city.nameHi : shop.city.nameEn}`;
  return { title: shop.shopName, description, openGraph: { title: shop.shopName, description, url, images: ogKey ? [storage.publicUrl(ogKey)] : [] } };
}

export default async function ShopPage({ params, searchParams }: PageProps<"/shop/[slug]">) {
  const [shop, sp] = await Promise.all([params.then((p) => load(p.slug)), searchParams]);
  if (!shop) notFound();
  const [t, locale] = await Promise.all([getTranslations("shop_page"), getLocale()]);
  const hi = locale === "hi";
  const url = `${env.APP_URL}/shop/${shop.slug}`;
  const maps = shop.mapLat != null && shop.mapLng != null ? `https://www.google.com/maps/search/?api=1&query=${shop.mapLat},${shop.mapLng}` : null;

  return (
    <>
      <AppBar />
      <main className="flex flex-1 flex-col gap-6 px-4 pb-8 pt-2 sm:px-8">
        <section className="flex flex-col gap-4 bg-card sm:flex-row">
          {shop.shopPhotoKey && (
            <div className="relative aspect-[4/3] w-full shrink-0 sm:w-72">
              <Image src={imageSrc(shop.shopPhotoKey)} alt="" fill priority sizes="(min-width: 640px) 18rem, 100vw" className="object-cover" />
            </div>
          )}
          <div className="flex flex-col gap-3 p-4">
            <h1 className="flex items-center gap-2 text-3xl font-semibold sm:text-4xl">
              {shop.shopName}
              {shop.isVerified && <BadgeCheck className="size-7 text-[var(--haldi)]" aria-label={t("verified")} />}
            </h1>
            <p className="flex items-center gap-2 text-lg">
              <MapPin className="size-5 shrink-0 text-[var(--haldi)]" />
              {shop.addressLine}, {hi ? shop.area.nameHi : shop.area.nameEn}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button nativeButton={false} render={<a href={waLink(shop.whatsappPhone, t("hello"))} />} className="h-12 gap-2 bg-[#1f8a4c] text-base text-white hover:bg-[#1f8a4c]/85">
                <MessageCircle className="size-5" />
                {t("whatsapp")}
              </Button>
              {maps && (
                <Button variant="outline" nativeButton={false} render={<a href={maps} target="_blank" rel="noreferrer" />} className="h-12 gap-2 text-base">
                  <Navigation className="size-5" />
                  {t("directions")}
                </Button>
              )}
              <Button variant="outline" nativeButton={false} render={<a href={waShare(`${shop.shopName} ${url}`)} />} className="h-12 gap-2 text-base">
                <Share2 className="size-5" />
                {t("share")}
              </Button>
            </div>
          </div>
        </section>
        <CatalogListing path={`/shop/${shop.slug}`} filters={parseFilters(sp)} shopId={shop.id} />
      </main>
      <SiteFooter />
    </>
  );
}
