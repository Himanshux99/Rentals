"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/server/env";
import { requireLiveShop } from "@/server/seller";
import { createDesign, updateProduct, type NewDesign } from "@/server/services/products";

// Error values are message keys in the "product" namespace; the form translates them.
export type ProductFormState = {
  errors?: Partial<Record<"category" | "forWhom" | "colours" | "price" | "form", string>>;
  colourErrors?: Record<string, string>;
};

const id = z.string().min(1).max(40);
const price = z.number().int().min(1).max(10_00_000).nullable();
const schema = z
  .object({
    categoryId: id,
    forWhomId: id,
    ageRangeIds: z.array(id).max(20),
    occasionIds: z.array(id).max(20),
    setPieceIds: z.array(id).max(20),
    rentPerDay: price,
    rentPerWeek: price,
    sellPrice: price,
    securityDeposit: price,
    description: z.string().trim().max(1000).nullable(),
    colours: z
      .array(
        z.object({
          colourId: id,
          images: z.array(z.object({ key: z.string().max(200), ogKey: z.string().max(200) })).min(1).max(env.NEXT_PUBLIC_MAX_IMAGES_PER_PRODUCT),
          sizes: z.array(z.object({ sizeId: id, stock: z.number().int().min(1).max(99) })).min(1).max(20),
        }),
      )
      .min(1)
      .max(20),
  })
  .refine((d) => d.rentPerDay ?? d.rentPerWeek ?? d.sellPrice, { path: ["price"] });

type Parsed = { ok: true; data: NewDesign; productId?: string } | { ok: false; state: ProductFormState };

function parse(formData: FormData): Parsed {
  let raw: { colours?: { colourId?: string }[]; productId?: unknown };
  try {
    raw = JSON.parse(String(formData.get("payload")));
  } catch {
    return { ok: false, state: { errors: { form: "failed" } } };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const state: Required<ProductFormState> = { errors: {}, colourErrors: {} };
    for (const { path } of parsed.error.issues) {
      const [field, i, sub] = path;
      if (field === "categoryId") state.errors.category = "pickCategory";
      else if (field === "forWhomId") state.errors.forWhom = "pickForWhom";
      else if (field === "price") state.errors.price = "needPrice";
      else if (field === "colours" && typeof i === "number" && (sub === "images" || sub === "sizes")) {
        const cid = raw.colours?.[i]?.colourId;
        if (cid) state.colourErrors[cid] ??= sub === "images" ? "needImage" : "needSize";
      } else if (field === "colours") state.errors.colours = "pickColour";
      else state.errors.form = "failed";
    }
    return { ok: false, state };
  }
  return { ok: true, data: parsed.data, productId: typeof raw.productId === "string" ? raw.productId : undefined };
}

export async function createDesignAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const { shop, user } = await requireLiveShop();
  const p = parse(formData);
  if (!p.ok) return p.state;
  let codes: string[];
  try {
    codes = await createDesign(shop.id, user.id, p.data);
  } catch (e) {
    console.error(e);
    return { errors: { form: "failed" } };
  }
  redirect(`/seller?added=${codes.length}`);
}

export async function updateProductAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const { shop, user } = await requireLiveShop();
  const p = parse(formData);
  if (!p.ok) return p.state;
  if (!p.productId) return { errors: { form: "failed" } };
  try {
    await updateProduct(shop.id, user.id, p.productId, p.data);
  } catch (e) {
    console.error(e);
    return { errors: { form: "failed" } };
  }
  redirect("/seller");
}
