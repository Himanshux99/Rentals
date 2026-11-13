import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/app/confirm-button";
import { Stripe } from "@/components/app/stripe";
import { env } from "@/server/env";
import { getSellerContext } from "@/server/seller";
import { listCitiesWithAreas } from "@/server/services/places";
import { storage } from "@/server/storage";
import { OnboardingForm } from "../onboarding/onboarding-form";
import { deleteAccountAction, updateShopAction } from "./actions";

export const metadata: Metadata = { title: "Shop settings" };

export default async function SettingsPage() {
  const { shop } = await getSellerContext();
  if (!shop) redirect("/seller/onboarding");
  const [t, cities] = await Promise.all([getTranslations("settings"), listCitiesWithAreas()]);

  return (
    <div className="mx-auto flex w-full max-w-[36rem] flex-col gap-8">
      <section className="bg-card">
        <Stripe />
        <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
          <h1 className="text-4xl font-semibold">{t("title")}</h1>
          <OnboardingForm
            action={updateShopAction}
            cities={cities}
            defaultCitySlug={env.DEFAULT_CITY_SLUG}
            loginPhone={shop.loginPhone}
            maxEdge={env.NEXT_PUBLIC_IMAGE_MAX_EDGE}
            submitLabel="saveSettings"
            initial={{
              shopName: shop.shopName,
              ownerName: shop.ownerName,
              whatsapp: shop.whatsappPhone === shop.loginPhone ? "" : shop.whatsappPhone.replace("+91", ""),
              cityId: shop.cityId,
              areaId: shop.areaId,
              addressLine: shop.addressLine,
              pin: shop.mapLat != null && shop.mapLng != null ? { lat: shop.mapLat, lng: shop.mapLng } : null,
              photo: shop.shopPhotoKey ? { key: shop.shopPhotoKey, url: storage.publicUrl(shop.shopPhotoKey) } : null,
            }}
          />
        </div>
      </section>

      <section className="flex flex-col items-start gap-3 bg-card px-6 py-8 sm:px-10">
        <h2 className="text-2xl font-semibold">{t("deleteTitle")}</h2>
        <p className="text-base">{t("deleteBody")}</p>
        <ConfirmButton
          action={deleteAccountAction}
          className="h-12 gap-2 text-base text-destructive"
          trigger={
            <>
              <Trash2 className="size-5" />
              {t("deleteButton")}
            </>
          }
          title={t("deleteConfirmTitle")}
          body={t("deleteConfirmBody", { shop: shop.shopName })}
          confirm={t("deleteButton")}
          cancel={t("cancel")}
        />
      </section>
    </div>
  );
}
