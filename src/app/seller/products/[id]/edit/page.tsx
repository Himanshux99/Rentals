import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Stripe } from "@/components/app/stripe";
import { env } from "@/server/env";
import { requireLiveShop } from "@/server/seller";
import { getProductForEdit, listProductOptions } from "@/server/services/products";
import { toInitial } from "../../initial";
import { ProductForm } from "../../new/product-form";

export const metadata: Metadata = { title: "Edit dress" };

export default async function EditProductPage({ params }: PageProps<"/seller/products/[id]/edit">) {
  const { shop } = await requireLiveShop();
  const { id } = await params;
  const [t, locale, options, product] = await Promise.all([getTranslations("product"), getLocale(), listProductOptions(), getProductForEdit(shop.id, id)]);
  if (!product) notFound();

  return (
    <section className="mx-auto w-full max-w-[40rem] bg-card">
      <Stripe />
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
        <h1 className="text-4xl font-semibold">{t("editTitle")}</h1>
        <p className="text-lg">
          {locale === "hi" ? product.titleHi : product.titleEn} · {product.code}
        </p>
        <p className="text-base text-muted-foreground">{t("editBody")}</p>
        <ProductForm
          options={options}
          maxImages={env.NEXT_PUBLIC_MAX_IMAGES_PER_PRODUCT}
          maxEdge={env.NEXT_PUBLIC_IMAGE_MAX_EDGE}
          initial={toInitial(product, true)}
          productId={product.id}
        />
      </div>
    </section>
  );
}
