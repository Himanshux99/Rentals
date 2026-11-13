import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Stripe } from "@/components/app/stripe";
import { env } from "@/server/env";
import { getSellerContext } from "@/server/seller";
import { listCitiesWithAreas } from "@/server/services/places";
import { createShopAction } from "./actions";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Your shop" };

export default async function OnboardingPage() {
  const { user, shop } = await getSellerContext();
  if (shop) redirect("/seller");
  const [t, cities] = await Promise.all([getTranslations("onboarding"), listCitiesWithAreas()]);

  return (
    <section className="mx-auto w-full max-w-[36rem] bg-card">
      <Stripe />
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
        <h1 className="text-4xl font-semibold">{t("title")}</h1>
        <p className="text-lg">{t("body")}</p>
        <OnboardingForm action={createShopAction} cities={cities} defaultCitySlug={env.DEFAULT_CITY_SLUG} loginPhone={user.phoneNumber ?? ""} maxEdge={env.NEXT_PUBLIC_IMAGE_MAX_EDGE} />
      </div>
    </section>
  );
}
