"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/server/auth";
import { env } from "@/server/env";
import { createDesign } from "@/server/services/products";
import { getShopForUser } from "@/server/services/shops";

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

export async function createDesignAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const user = await requireRole("seller");
  const shop = await getShopForUser(user.id, user.phoneNumber);
  if (shop?.status !== "approved") redirect("/seller");

  let raw: { colours?: { colourId?: string }[] };
  try {
    raw = JSON.parse(String(formData.get("payload")));
  } catch {
    return { errors: { form: "failed" } };
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
    return state;
  }

  let codes: string[];
  try {
    codes = await createDesign(shop.id, user.id, parsed.data);
  } catch (e) {
    console.error(e);
    return { errors: { form: "failed" } };
  }
  redirect(`/seller?added=${codes.length}`);
}
