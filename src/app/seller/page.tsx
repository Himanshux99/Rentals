import Image from "next/image";
import { SubmitButton } from "@/components/feedback/submit-button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Check, CircleCheck, Clock, Copy, Eye, EyeOff, Handshake, MessageCircle, PauseCircle, Pencil, Plus, Settings, Shirt, ShoppingBag, Store, Trash2, TriangleAlert, Undo2 } from "lucide-react";
import { WhatsAppIcon } from "@/components/app/whatsapp-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/app/confirm-button";
import { Stripe } from "@/components/app/stripe";
import { isStale, waShare } from "@/lib/catalog";
import { stillKey } from "@/lib/media";
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
  const [t, tm, locale] = await Promise.all([getTranslations("seller"), getTranslations("moderation"), getLocale()]);

  if (shop.status !== "approved") {
    const pending = shop.status === "pending";
    const Icon = pending ? Clock : PauseCircle;
    return (
      <section className="mx-auto w-full max-w-[34rem] bg-card">
        <Stripe />
        <div className="flex flex-col gap-5 px-6 py-8 sm:px-10">
          <Icon className="size-10 text-[var(--gold)]" aria-hidden />
          <h1 className="text-4xl font-semibold">{t(pending ? "pendingTitle" : "suspendedTitle")}</h1>
          <p className="text-lg">
            {t(pending ? "pendingBody" : "suspendedBody", {
              shop: shop.shopName,
            })}
          </p>
          <Button variant="outline" nativeButton={false} render={<Link href="/seller/settings" />} className="h-12 w-fit gap-2 text-base">
            <Settings className="size-5" />
            {t("settings")}
          </Button>
        </div>
      </section>
    );
  }

  const [area, products, { added, review }, format] = await Promise.all([db.area.findUniqueOrThrow({ where: { id: shop.areaId } }), listDashboardProducts(shop.id), searchParams, getFormatter()]);
  // every size out on rent: listed apart so the seller sees what can still be rented today
  const rentedOut = products.filter((p) => p.sizes.length > 0 && p.sizes.every((s) => s.availableCount === 0));
  const groups = [products.filter((p) => !rentedOut.includes(p)), rentedOut];
  const hi = locale === "hi";
  const now = new Date();
  const shopUrl = `${env.APP_URL}/shop/${shop.slug}`;
  const today = todayIST();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
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
          <WhatsAppIcon className="text-[var(--whatsapp)]" />
          {t("shareShop")}
        </Button>
        <Button variant="ghost" nativeButton={false} render={<Link href="/seller/settings" />} className="h-12 gap-2 text-base">
          <Settings className="size-5" />
          {t("settings")}
        </Button>
      </div>

      {review ? (
        <Alert>
          <Clock />
          <AlertTitle className="text-base">{t("sentForReview")}</AlertTitle>
        </Alert>
      ) : (
        Number(added) > 0 && (
          <Alert>
            <CircleCheck />
            <AlertTitle className="text-base">{t("added", { count: Number(added) })}</AlertTitle>
          </Alert>
        )
      )}

      {products.length === 0 ? (
        <section className="flex flex-col items-start gap-3 bg-card px-6 py-10 sm:px-10">
          <Shirt className="size-10 text-[var(--gold)]" aria-hidden />
          <h2 className="text-2xl font-semibold">{t("emptyTitle")}</h2>
          <p className="text-lg">{t("emptyBody")}</p>
        </section>
      ) : (
        <>
          {/* jump links, not tabs: both groups stay on the page so nothing is hidden */}
          <nav className="grid grid-cols-2 gap-2 sm:flex">
            {groups.map((group, i) => (
              <Button key={i} variant={i === 0 ? "default" : "outline"} nativeButton={false} render={<a href={i === 0 ? "#available" : "#rented"} />} className="h-12 gap-2 px-5 text-base font-semibold">
                {i === 0 ? <CircleCheck className="size-5" /> : <Handshake className="size-5" />}
                {t(i === 0 ? "availableTab" : "rentedOutTitle", { count: group.length })}
              </Button>
            ))}
          </nav>
        {groups.map((group, i) => (
              <section key={i} id={i === 0 ? "available" : "rented"} className="flex scroll-mt-4 flex-col gap-3">
                <h2 className="text-2xl font-semibold">{t(i === 0 ? "availableTab" : "rentedOutTitle", { count: group.length })}</h2>
                {group.length === 0 && <p className="bg-card px-6 py-10 text-lg text-muted-foreground">{t(i === 0 ? "noneAvailable" : "noneRented")}</p>}
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {group.map((p) => {
                    const forSale = p.design.sellPrice != null;
                    return (
                      <li
                        key={p.id}
                        className={`flex min-w-0 flex-col gap-3 border bg-card p-3 shadow-xs transition-shadow hover:shadow-md ${p.isHidden || p.hiddenByAdmin || p.moderation !== "approved" ? "opacity-70" : ""}`}
                      >
                        {p.moderation === "rejected" && (
                          <Alert variant="destructive">
                            <TriangleAlert />
                            <AlertTitle className="text-base">{t("rejectedTitle")}</AlertTitle>
                            <AlertDescription className="text-base">
                              {p.rejectReason && tm.has(`reason_${p.rejectReason}`) && <p>{tm(`reason_${p.rejectReason}`)}</p>}
                              {p.rejectNote && <p>“{p.rejectNote}”</p>}
                              <p>{t("rejectedBody")}</p>
                            </AlertDescription>
                          </Alert>
                        )}
                        {isStale(p.lastSellerTouchAt, now, env.STALE_AFTER_DAYS) && !p.isHidden && (
                          <Alert className="border-primary">
                            <TriangleAlert />
                            <AlertTitle className="text-base">{t("staleTitle")}</AlertTitle>
                            <AlertDescription>
                              <form action={confirmAction.bind(null, p.id)}>
                                <SubmitButton className="mt-2 h-12 text-base">{t("staleConfirm")}</SubmitButton>
                              </form>
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="flex flex-col gap-3">
                          <Link href={`/p/${p.code}`} aria-label={hi ? p.titleHi : p.titleEn} className="relative block aspect-square w-full overflow-hidden bg-muted">
                            {p.images[0] && (
                              <Image
                                src={imageSrc(stillKey(p.images[0]))}
                                alt=""
                                fill
                                sizes="(min-width: 1024px) 18rem, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                                className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                              />
                            )}
                          </Link>
                          <div className="flex min-w-0 flex-col gap-1">
                            <p className="line-clamp-2 text-base font-semibold leading-snug min-h-[2lh]">{hi ? p.titleHi : p.titleEn}</p>
                            <p className="text-sm tabular-nums text-muted-foreground">{p.code}</p>
                            {p.moderation === "pending" && <Badge variant="secondary">{t("inReview")}</Badge>}
                            {p.hiddenByAdmin && <Badge variant="destructive">{t("hiddenByAdmin")}</Badge>}
                            {p.isHidden && !p.hiddenByAdmin && <Badge variant="secondary">{t("hidden")}</Badge>}
                            <p className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Eye className="size-4" />
                                {t("stat", { recent: p.views30, total: p.viewCount })}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="size-4" />
                                {t("stat", {
                                  recent: p.clicks30,
                                  total: p.enquiryCount,
                                })}
                              </span>
                            </p>
                          </div>
                        </div>

                        <ul className="flex flex-col gap-2">
                          {p.sizes.map((s) => (
                            <li key={s.id} className="flex flex-col gap-2 bg-muted p-2">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="text-base font-semibold">{hi ? s.size.nameHi : s.size.nameEn}</span>
                                <span className="text-sm text-muted-foreground">
                                  {t("availableOf", {
                                    available: s.availableCount,
                                    stock: s.stockCount,
                                  })}
                                </span>
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                {s.availableCount > 0 && (
                                  <form action={availableAction.bind(null, s.id, -1)} className={s.availableCount < s.stockCount ? "" : "col-span-2"}>
                                    <SubmitButton className="h-12 w-full gap-2 text-base">
                                      <Handshake className="size-5" />
                                      {t("rentedBtn")}
                                    </SubmitButton>
                                  </form>
                                )}
                                {s.availableCount < s.stockCount && (
                                  <form action={availableAction.bind(null, s.id, 1)} className={s.availableCount > 0 ? "" : "col-span-2"}>
                                    <SubmitButton variant="outline" className="h-12 w-full gap-2 bg-card text-base">
                                      <Undo2 className="size-5" />
                                      {t("returnedBtn")}
                                    </SubmitButton>
                                  </form>
                                )}
                              </div>
                              {s.availableCount < s.stockCount && (
                                <form action={freeFromAction.bind(null, s.id)} className="flex flex-col gap-1">
                                  <label className="text-sm text-muted-foreground" htmlFor={`free-${s.id}`}>
                                    {s.freeFromDate
                                      ? t("freeFromSet", {
                                          date: format.dateTime(s.freeFromDate, {
                                            day: "numeric",
                                            month: "short",
                                            timeZone: "UTC",
                                          }),
                                        })
                                      : t("freeFrom")}
                                  </label>
                                  <div className="flex">
                                    <Input
                                      id={`free-${s.id}`}
                                      type="date"
                                      name="date"
                                      min={today}
                                      defaultValue={s.freeFromDate?.toISOString().slice(0, 10)}
                                      className="h-12 min-w-0 flex-1 bg-card text-base md:text-base"
                                    />
                                    <SubmitButton variant="outline" className="size-12 shrink-0" aria-label={t("saveDate")}>
                                      <Check className="size-5" />
                                    </SubmitButton>
                                  </div>
                                </form>
                              )}
                              {forSale && s.stockCount > 0 && (
                                <form action={soldAction.bind(null, s.id)}>
                                  <SubmitButton variant="ghost" className="h-12 gap-2 text-base">
                                    <ShoppingBag className="size-5" />
                                    {t("markSold")}
                                  </SubmitButton>
                                </form>
                              )}
                            </li>
                          ))}
                        </ul>

                        <div className="mt-auto grid grid-cols-2 gap-1 border-t pt-2">
                          {!p.hiddenByAdmin && (
                            <form action={hideAction.bind(null, p.id, !p.isHidden)}>
                              <SubmitButton variant="ghost" className="h-12 w-full justify-start gap-2 text-base">
                                {p.isHidden ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
                                {p.isHidden ? t("show") : t("hide")}
                              </SubmitButton>
                            </form>
                          )}
                          <Button variant="ghost" nativeButton={false} render={<Link href={`/seller/products/${p.id}/edit`} />} className="h-12 justify-start gap-2 text-base">
                            <Pencil className="size-5" />
                            {t("edit")}
                          </Button>
                          <Button variant="ghost" nativeButton={false} render={<Link href={`/seller/products/new?from=${p.id}`} />} className="h-12 justify-start gap-2 text-base">
                            <Copy className="size-5" />
                            {t("duplicate")}
                          </Button>
                          <ConfirmButton
                            action={deleteAction.bind(null, p.id)}
                            className="h-12 w-full justify-start gap-2 text-base text-destructive"
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
              </section>
        ))}
        </>
      )}
    </div>
  );
}
