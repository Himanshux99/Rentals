import "server-only";
import { z } from "zod";
import { INDIAN_MOBILE } from "@/lib/slug";
import { isOwnKey } from "@/lib/upload-key";
import type { NewShop } from "@/server/services/shops";

type Key = "shopName" | "ownerName" | "whatsapp" | "areaId" | "addressLine" | "form";
// Error values are message keys in the "onboarding" namespace; the form translates them.
export type OnboardingState = {
  errors?: Partial<Record<Key, "required" | "pickArea" | "invalidPhone" | "failed" | "phoneTaken">>;
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

/**
 * Shared by onboarding, settings and admin create. `loginPhone` null means the form's whatsapp field
 * is the only number. A photo key is kept only when it sits under one of `photoPrefixes`.
 */
export async function parseShopForm(
  formData: FormData,
  loginPhone: string | null,
  photoPrefixes: string[],
): Promise<{ ok: true; input: NewShop; values: Record<string, string> } | { ok: false; state: OnboardingState }> {
  // empty hidden inputs mean "not given"
  const raw = Object.fromEntries([...formData].filter(([, v]) => v !== ""));
  const values = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, String(v)]));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors: OnboardingState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0]);
      if (k === "areaId" || k === "cityId") errors.areaId = "pickArea";
      else if (k in { shopName: 1, ownerName: 1, addressLine: 1 }) errors[k as Key] = "required";
      else errors.form = "failed";
    }
    return { ok: false, state: { errors, values } };
  }
  const d = parsed.data;
  const whatsappPhone = d.sameAsLogin && loginPhone ? loginPhone : `+91${(d.whatsapp ?? "").replace(/\D/g, "")}`;
  if (!INDIAN_MOBILE.test(whatsappPhone)) return { ok: false, state: { errors: { whatsapp: "invalidPhone" }, values } };
  const photo = d.shopPhotoKey && photoPrefixes.some((p) => isOwnKey(d.shopPhotoKey!, p)) ? d.shopPhotoKey : null;
  return {
    ok: true,
    values,
    input: {
      shopName: d.shopName,
      ownerName: d.ownerName,
      whatsappPhone,
      cityId: d.cityId,
      areaId: d.areaId,
      addressLine: d.addressLine,
      mapLat: d.mapLat ?? null,
      mapLng: d.mapLng ?? null,
      shopPhotoKey: photo,
    },
  };
}
