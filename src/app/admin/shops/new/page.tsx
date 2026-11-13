import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OnboardingForm } from "@/app/seller/onboarding/onboarding-form";
import { Stripe } from "@/components/app/stripe";
import { env } from "@/server/env";
import { listCitiesWithAreas } from "@/server/services/places";
import { adminCreateShopAction } from "../../actions";

export const metadata: Metadata = { title: "Create shop" };

export default async function AdminCreateShop() {
  const [t, cities] = await Promise.all([getTranslations("admin"), listCitiesWithAreas()]);
  return (
    <section className="mx-auto w-full max-w-[36rem] bg-card">
      <Stripe />
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
        <h1 className="text-4xl font-semibold">{t("createShop")}</h1>
        <p className="text-lg">{t("createShopBody")}</p>
        {/* the photo is added later via "act as seller": uploads are scoped to a shop */}
        <OnboardingForm
          action={adminCreateShopAction}
          cities={cities}
          defaultCitySlug={env.DEFAULT_CITY_SLUG}
          loginPhone=""
          maxEdge={env.NEXT_PUBLIC_IMAGE_MAX_EDGE}
          submitLabel="createForShop"
          allowPhoto={false}
        />
      </div>
    </section>
  );
}
