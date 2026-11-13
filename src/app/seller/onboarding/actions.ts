"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { INDIAN_MOBILE } from "@/lib/slug";
import { isOwnKey, shopPhotoPrefix } from "@/lib/upload-key";
import { requireRole } from "@/server/auth";
import { createShop, getShopForUser } from "@/server/services/shops";

type Key = "shopName" | "ownerName" | "whatsapp" | "areaId" | "addressLine" | "form";
// Error values are message keys in the "onboarding" namespace; the form translates them.
export type OnboardingState = {
  errors?: Partial<Record<Key, "required" | "pickArea" | "invalidPhone" | "failed">>;
  // echoed back so React's post-action form reset keeps what the seller typed
  values?: Record<string, string>;
};

const schema = z.object({
  shopName: z.string().trim().min(2).max(80),
  ownerName: z.string().trim().min(2).max(80),
  sameAsLogin: z.literal("on").optional(),
  whatsapp: z.string().trim().optional(),
  cityId: z.string().min(1),
  areaId: z.string().min(1),
  addressLine: z.string().trim().min(3).max(200),
  mapLat: z.coerce.number().min(-90).max(90).optional(),
  mapLng: z.coerce.number().min(-180).max(180).optional(),
  shopPhotoKey: z.string().max(200).optional(),
});

export async function createShopAction(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const user = await requireRole("seller");
  if (await getShopForUser(user.id, user.phoneNumber)) redirect("/seller");

  // empty hidden inputs mean "not given"
  const raw = Object.fromEntries([...formData].filter(([, v]) => v !== ""));
  const values = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, String(v)]));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors: OnboardingState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0]);
      if (k === "areaId" || k === "cityId") errors.areaId = "pickArea";
      else errors[k as Key] = "required";
    }
    return { errors, values };
  }
  const d = parsed.data;
  const whatsappPhone = d.sameAsLogin ? user.phoneNumber! : `+91${(d.whatsapp ?? "").replace(/\D/g, "")}`;
  if (!INDIAN_MOBILE.test(whatsappPhone)) return { errors: { whatsapp: "invalidPhone" }, values };
  const shopPhotoKey = d.shopPhotoKey && isOwnKey(d.shopPhotoKey, shopPhotoPrefix(user.id)) ? d.shopPhotoKey : null;

  try {
    await createShop(user.id, user.phoneNumber!, {
      shopName: d.shopName,
      ownerName: d.ownerName,
      whatsappPhone,
      cityId: d.cityId,
      areaId: d.areaId,
      addressLine: d.addressLine,
      mapLat: d.mapLat ?? null,
      mapLng: d.mapLng ?? null,
      shopPhotoKey,
    });
  } catch (e) {
    console.error(e);
    return { errors: { form: "failed" }, values };
  }
  redirect("/seller");
}
