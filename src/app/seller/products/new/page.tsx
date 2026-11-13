import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Stripe } from "@/components/app/stripe";
import { env } from "@/server/env";
import { requireLiveShop } from "@/server/seller";
import { getProductForEdit, listProductOptions } from "@/server/services/products";
import { toInitial } from "../initial";
import { ProductForm } from "./product-form";

export const metadata: Metadata = { title: "Add a dress" };

// ?from=<productId> is Duplicate (SPEC §6): the design's shared fields, ready for new colours and photos.
export default async function NewProductPage({ searchParams }: PageProps<"/seller/products/new">) {
  const { shop } = await requireLiveShop();
  const { from } = await searchParams;
  const [t, options, source] = await Promise.all([
    getTranslations("product"),
    listProductOptions(),
    typeof from === "string" ? getProductForEdit(shop.id, from) : null,
  ]);

  return (
    <section className="mx-auto w-full max-w-[40rem] bg-card">
      <Stripe />
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
        <h1 className="text-4xl font-semibold">{t(source ? "duplicateTitle" : "title")}</h1>
        <p className="text-lg">{t(source ? "duplicateBody" : "body")}</p>
        <ProductForm
          options={options}
          maxImages={env.NEXT_PUBLIC_MAX_IMAGES_PER_PRODUCT}
          maxEdge={env.NEXT_PUBLIC_IMAGE_MAX_EDGE}
          initial={source ? toInitial(source, false) : undefined}
        />
      </div>
    </section>
  );
}
