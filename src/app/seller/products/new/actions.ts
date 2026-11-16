"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/server/env";
import { requireLiveShop } from "@/server/seller";
import { createDesign, updateProduct, type NewDesign } from "@/server/services/products";

// Error values are message keys in the "product" namespace; the form translates them.
export type ProductFormState = {
  errors?: Partial<Record<"category" | "forWhom" | "colours" | "images" | "sizes" | "price" | "form", string>>;
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
    fabricIds: z.array(id).max(20),
    workIds: z.array(id).max(20),
    colourIds: z.array(id).min(1).max(20),
    images: z.array(z.object({ key: z.string().max(200), ogKey: z.string().max(200) })).min(1).max(env.NEXT_PUBLIC_MAX_IMAGES_PER_PRODUCT),
    sizes: z.array(z.object({ sizeId: id, stock: z.number().int().min(1).max(99) })).min(1).max(20),
    rentPerDay: price,
    rentPerWeek: price,
    sellPrice: price,
    securityDeposit: price,
    description: z.string().trim().max(1000).nullable(),
  })
  .refine((d) => d.rentPerDay ?? d.rentPerWeek ?? d.sellPrice, { path: ["price"] });

type Parsed = { ok: true; data: NewDesign; productId?: string } | { ok: false; state: ProductFormState };

function parse(formData: FormData): Parsed {
  let raw: { productId?: unknown };
  try {
    raw = JSON.parse(String(formData.get("payload")));
  } catch {
    return { ok: false, state: { errors: { form: "failed" } } };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const state: Required<ProductFormState> = { errors: {} };
    const keys = { categoryId: ["category", "pickCategory"], forWhomId: ["forWhom", "pickForWhom"], colourIds: ["colours", "pickColour"], images: ["images", "needImage"], sizes: ["sizes", "needSize"], price: ["price", "needPrice"] } as const;
    for (const { path } of parsed.error.issues) {
      const [field, msg] = keys[path[0] as keyof typeof keys] ?? ["form", "failed"];
      state.errors[field] = msg;
    }
    return { ok: false, state };
  }
  return { ok: true, data: parsed.data, productId: typeof raw.productId === "string" ? raw.productId : undefined };
}

export async function createDesignAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const { shop, user } = await requireLiveShop();
  const p = parse(formData);
  if (!p.ok) return p.state;
  let review: boolean;
  try {
    review = (await createDesign(shop.id, user.id, p.data)).moderation === "pending";
  } catch (e) {
    console.error(e);
    return { errors: { form: "failed" } };
  }
  redirect(review ? "/seller?added=1&review=1" : "/seller?added=1");
}

export async function updateProductAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const { shop, user } = await requireLiveShop();
  const p = parse(formData);
  if (!p.ok) return p.state;
  if (!p.productId) return { errors: { form: "failed" } };
  let review: boolean;
  try {
    review = (await updateProduct(shop.id, user.id, p.productId, p.data)) === "pending";
  } catch (e) {
    console.error(e);
    return { errors: { form: "failed" } };
  }
  redirect(review ? "/seller?review=1" : "/seller");
}
