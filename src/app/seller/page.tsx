import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CircleCheck, Clock, PauseCircle, Plus, Shirt } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Stripe } from "@/components/app/stripe";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db";
import { listShopProducts } from "@/server/services/products";
import { getShopForUser } from "@/server/services/shops";
import { storage } from "@/server/storage";

export default async function SellerHome({ searchParams }: PageProps<"/seller">) {
  const user = await requireRole("seller");
  const shop = await getShopForUser(user.id, user.phoneNumber);
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
        </div>
      </section>
    );
  }

  const [area, products, { added }] = await Promise.all([
    db.area.findUniqueOrThrow({ where: { id: shop.areaId } }),
    listShopProducts(shop.id),
    searchParams,
  ]);
  const hi = locale === "hi";
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-semibold sm:text-5xl">{t("liveTitle", { shop: shop.shopName })}</h1>
          <p className="text-lg text-muted-foreground">{t("liveBody", { area: hi ? area.nameHi : area.nameEn })}</p>
        </div>
        <Button render={<Link href="/seller/products/new" />} nativeButton={false} className="h-14 gap-2 px-6 text-lg">
          <Plus className="size-5" />
          {t("addDress")}
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
        <ul className="grid gap-4 sm:grid-cols-2">
          {products.map((p) => (
            <li key={p.id} className="flex gap-4 bg-card p-3">
              {p.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element -- storage URL; next/image comes with the public pages
                <img src={storage.publicUrl(p.images[0].key)} alt="" loading="lazy" className="aspect-[3/4] w-24 shrink-0 object-cover" />
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-lg font-semibold leading-snug">{hi ? p.titleHi : p.titleEn}</p>
                <p className="text-base tabular-nums text-muted-foreground">{p.code}</p>
                <p className="text-base">{p.sizes.map((s) => `${hi ? s.size.nameHi : s.size.nameEn} × ${s.stockCount}`).join(", ")}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
