import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Stripe } from "@/components/app/stripe";
import { requireRole } from "@/server/auth";
import { env } from "@/server/env";
import { listProductOptions } from "@/server/services/products";
import { getShopForUser } from "@/server/services/shops";
import { ProductForm } from "./product-form";

export const metadata: Metadata = { title: "Add a dress" };

export default async function NewProductPage() {
  const user = await requireRole("seller");
  const shop = await getShopForUser(user.id, user.phoneNumber);
  if (shop?.status !== "approved") redirect("/seller");
  const [t, options] = await Promise.all([getTranslations("product"), listProductOptions()]);

  return (
    <section className="mx-auto w-full max-w-[40rem] bg-card">
      <Stripe />
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
        <h1 className="text-4xl font-semibold">{t("title")}</h1>
        <p className="text-lg">{t("body")}</p>
        <ProductForm options={options} maxImages={env.NEXT_PUBLIC_MAX_IMAGES_PER_PRODUCT} maxEdge={env.NEXT_PUBLIC_IMAGE_MAX_EDGE} />
      </div>
    </section>
  );
}
