"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { shopPhotoPrefix } from "@/lib/upload-key";
import { signOut } from "@/server/auth";
import { getSellerContext } from "@/server/seller";
import { softDeleteShop, updateShop } from "@/server/services/shops";
import { parseShopForm, type OnboardingState } from "../onboarding/shop-form";

export async function updateShopAction(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const { user, shop } = await getSellerContext();
  if (!shop) redirect("/seller/onboarding");
  // keep the saved photo, or accept one uploaded under the shop (settings) or the owner (onboarding)
  const prefixes = [shopPhotoPrefix(shop.id), ...(shop.ownerUserId ? [shopPhotoPrefix(shop.ownerUserId)] : [])];
  const p = await parseShopForm(formData, shop.loginPhone, prefixes);
  if (!p.ok) return p.state;
  try {
    await updateShop(shop.id, user.id, p.input);
  } catch (e) {
    console.error(e);
    return { errors: { form: "failed" }, values: p.values };
  }
  revalidatePath("/seller");
  redirect("/seller");
}

export async function deleteAccountAction() {
  const { user, shop, impersonating } = await getSellerContext();
  if (!shop) redirect("/seller/onboarding");
  await softDeleteShop(shop.id, user.id);
  if (impersonating) redirect("/admin");
  await signOut();
  redirect("/");
}
