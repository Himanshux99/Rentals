import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { CircleCheck, Clock, Copy, Eye, EyeOff, MessageCircle, Minus, PauseCircle, Pencil, Plus, Settings, Share2, Shirt, ShoppingBag, Store, Trash2, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/app/confirm-button";
import { Stripe } from "@/components/app/stripe";
import { isStale, waShare } from "@/lib/catalog";
import { env } from "@/server/env";
import { getSellerContext } from "@/server/seller";
import { db } from "@/server/db";
import { listDashboardProducts } from "@/server/services/products";
import { imageSrc } from "@/server/storage";
import { availableAction, confirmAction, deleteAction, freeFromAction, hideAction, soldAction } from "./actions";

const todayIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

export default async function SellerHome({ searchParams }: PageProps<"/seller">) {
  const { shop } = await getSellerContext();
  if (!shop) redirect("/seller/onboarding");
  const [t, locale] = await Promise.all([getTranslations("seller"), getLocale()]);

  if (shop.status !== "approved") {
    const pending = shop.status === "pending";
    const Icon = pending ? Clock : PauseCircle;
    return (
      <section className="mx-auto w-full max-w-[34rem] bg-card">
        <Stripe />
        <div className="flex flex-col gap-5 px-6 py-8 sm:px-10">
          <Icon className="size-10 text-[var(--haldi)]" aria-hidden />
          <h1 className="text-4xl font-semibold">{t(pending ? "pendingTitle" : "suspendedTitle")}</h1>
          <p className="text-lg">{t(pending ? "pendingBody" : "suspendedBody", { shop: shop.shopName })}</p>
          <Button variant="outline" nativeButton={false} render={<Link href="/seller/settings" />} className="h-12 w-fit gap-2 text-base">
            <Settings className="size-5" />
            {t("settings")}
          </Button>
        </div>
      </section>
    );
  }

  const [area, products, { added }, format] = await Promise.all([
    db.area.findUniqueOrThrow({ where: { id: shop.areaId } }),
    listDashboardProducts(shop.id),
    searchParams,
    getFormatter(),
  ]);
  const hi = locale === "hi";
  const now = new Date();
  const shopUrl = `${env.APP_URL}/shop/${shop.slug}`;
  const today = todayIST();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold sm:text-5xl">{t("liveTitle", { shop: shop.shopName })}</h1>
        <p className="text-lg text-muted-foreground">{t("liveBody", { area: hi ? area.nameHi : area.nameEn })}</p>
      </div>

      {/* "Add product" stays in reach at the bottom of the screen on phones */}
      <div className="sticky bottom-3 z-10 order-last flex justify-end sm:static sm:order-none">
        <Button nativeButton={false} render={<Link href="/seller/products/new" />} className="h-14 gap-2 px-6 text-lg shadow-lg">
          <Plus className="size-5" />
          {t("addDress")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" nativeButton={false} render={<Link href={`/shop/${shop.slug}`} />} className="h-12 gap-2 text-base">
          <Store className="size-5" />
          {t("myShopPage")}
        </Button>
        <Button variant="outline" nativeButton={false} render={<a href={waShare(t("shareText", { shop: shop.shopName, url: shopUrl }))} />} className="h-12 gap-2 text-base">
          <Share2 className="size-5" />
          {t("shareShop")}
        </Button>
        <Button variant="ghost" nativeButton={false} render={<Link href="/seller/settings" />} className="h-12 gap-2 text-base">
          <Settings className="size-5" />
          {t("settings")}
        </Button>
      </div>

      {Number(added) > 0 && (
        <Alert>
          <CircleCheck />
          <AlertTitle className="text-base">{t("added", { count: Number(added) })}</AlertTitle>
        </Alert>
      )}

      {products.length === 0 ? (
        <section className="flex flex-col items-start gap-3 bg-card px-6 py-10 sm:px-10">
          <Shirt className="size-10 text-[var(--haldi)]" aria-hidden />
          <h2 className="text-2xl font-semibold">{t("emptyTitle")}</h2>
          <p className="text-lg">{t("emptyBody")}</p>
        </section>
      ) : (
        <ul className="flex flex-col gap-4">
          {products.map((p) => {
            const forSale = p.design.sellPrice != null;
            return (
              <li key={p.id} className={`flex flex-col gap-4 bg-card p-4 ${p.isHidden || p.hiddenByAdmin ? "opacity-70" : ""}`}>
                {isStale(p.lastSellerTouchAt, now, env.STALE_AFTER_DAYS) && !p.isHidden && (
                  <Alert className="border-[var(--haldi)]">
                    <TriangleAlert />
                    <AlertTitle className="text-base">{t("staleTitle")}</AlertTitle>
                    <AlertDescription>
                      <form action={confirmAction.bind(null, p.id)}>
                        <Button type="submit" className="mt-2 h-12 text-base">
                          {t("staleConfirm")}
                        </Button>
                      </form>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col gap-4">
                  <Link href={`/p/${p.code}`} className="relative block aspect-square w-full bg-muted">
                    {p.images[0] && <Image src={imageSrc(p.images[0].key)} alt="" fill sizes="(min-width: 768px) 48rem, 100vw" className="object-cover" />}
                  </Link>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-lg font-semibold leading-snug">{hi ? p.titleHi : p.titleEn}</p>
                    <p className="text-base tabular-nums text-muted-foreground">{p.code}</p>
                    {p.hiddenByAdmin && <Badge variant="destructive">{t("hiddenByAdmin")}</Badge>}
                    {p.isHidden && !p.hiddenByAdmin && <Badge variant="secondary">{t("hidden")}</Badge>}
                    <p className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="size-4" />
                        {t("stat", { recent: p.views30, total: p.viewCount })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="size-4" />
                        {t("stat", { recent: p.clicks30, total: p.enquiryCount })}
                      </span>
                    </p>
                  </div>
                </div>

                <ul className="flex flex-col gap-3">
                  {p.sizes.map((s) => (
                    <li key={s.id} className="flex flex-col gap-2 bg-muted p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-lg">
                          <span className="font-semibold">{hi ? s.size.nameHi : s.size.nameEn}</span> ·{" "}
                          {t("availableOf", { available: s.availableCount, stock: s.stockCount })}
                        </span>
                        <div className="flex">
                          <form action={availableAction.bind(null, s.id, -1)}>
                            <Button type="submit" variant="outline" className="size-12" disabled={s.availableCount <= 0} aria-label={t("oneOut")}>
                              <Minus className="size-5" />
                            </Button>
                          </form>
                          <form action={availableAction.bind(null, s.id, 1)}>
                            <Button type="submit" variant="outline" className="size-12" disabled={s.availableCount >= s.stockCount} aria-label={t("oneBack")}>
                              <Plus className="size-5" />
                            </Button>
                          </form>
                        </div>
                      </div>
                      {s.availableCount < s.stockCount && (
                        <form action={freeFromAction.bind(null, s.id)} className="flex flex-wrap items-center gap-2">
                          <label className="text-base" htmlFor={`free-${s.id}`}>
                            {s.freeFromDate ? t("freeFromSet", { date: format.dateTime(s.freeFromDate, { day: "numeric", month: "short", timeZone: "UTC" }) }) : t("freeFrom")}
                          </label>
                          <Input id={`free-${s.id}`} type="date" name="date" min={today} defaultValue={s.freeFromDate?.toISOString().slice(0, 10)} className="h-12 w-auto text-base md:text-base" />
                          <Button type="submit" variant="secondary" className="h-12 text-base">
                            {t("saveDate")}
                          </Button>
                        </form>
                      )}
                      {forSale && s.stockCount > 0 && (
                        <form action={soldAction.bind(null, s.id)}>
                          <Button type="submit" variant="ghost" className="h-12 gap-2 text-base">
                            <ShoppingBag className="size-5" />
                            {t("markSold")}
                          </Button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-1">
                  {!p.hiddenByAdmin && (
                    <form action={hideAction.bind(null, p.id, !p.isHidden)}>
                      <Button type="submit" variant="ghost" className="h-12 gap-2 text-base">
                        {p.isHidden ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
                        {p.isHidden ? t("show") : t("hide")}
                      </Button>
                    </form>
                  )}
                  <Button variant="ghost" nativeButton={false} render={<Link href={`/seller/products/${p.id}/edit`} />} className="h-12 gap-2 text-base">
                    <Pencil className="size-5" />
                    {t("edit")}
                  </Button>
                  <Button variant="ghost" nativeButton={false} render={<Link href={`/seller/products/new?from=${p.id}`} />} className="h-12 gap-2 text-base">
                    <Copy className="size-5" />
                    {t("duplicate")}
                  </Button>
                  <ConfirmButton
                    action={deleteAction.bind(null, p.id)}
                    className="h-12 gap-2 text-base text-destructive"
                    trigger={
                      <>
                        <Trash2 className="size-5" />
                        {t("delete")}
                      </>
                    }
                    title={t("deleteTitle")}
                    body={t("deleteBody", { code: p.code })}
                    confirm={t("delete")}
                    cancel={t("cancel")}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
