import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Clock, PauseCircle, Plus, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stripe } from "@/components/app/stripe";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db";
import { getShopForUser } from "@/server/services/shops";

export default async function SellerHome() {
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

  const area = await db.area.findUniqueOrThrow({ where: { id: shop.areaId } });
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-semibold sm:text-5xl">{t("liveTitle", { shop: shop.shopName })}</h1>
          <p className="text-lg text-muted-foreground">{t("liveBody", { area: locale === "hi" ? area.nameHi : area.nameEn })}</p>
        </div>
        <Button className="h-14 gap-2 px-6 text-lg" disabled>
          <Plus className="size-5" />
          {t("addDress")}
        </Button>
      </div>
      <section className="flex flex-col items-start gap-3 bg-card px-6 py-10 sm:px-10">
        <Shirt className="size-10 text-[var(--haldi)]" aria-hidden />
        <h2 className="text-2xl font-semibold">{t("emptyTitle")}</h2>
        <p className="text-lg">{t("emptyBody")}</p>
      </section>
    </div>
  );
}
