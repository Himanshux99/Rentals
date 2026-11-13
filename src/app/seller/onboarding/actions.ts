"use server";
import { redirect } from "next/navigation";
import { shopPhotoPrefix } from "@/lib/upload-key";
import { getSellerContext } from "@/server/seller";
import { createShop } from "@/server/services/shops";
import { parseShopForm, type OnboardingState } from "./shop-form";

export async function createShopAction(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const { user, shop } = await getSellerContext();
  if (shop) redirect("/seller");
  const p = await parseShopForm(formData, user.phoneNumber, [shopPhotoPrefix(user.id)]);
  if (!p.ok) return p.state;
  try {
    // no verified phone (OTP off): the WhatsApp number the seller typed becomes the login number
    await createShop(user.id, user.phoneNumber ?? p.input.whatsappPhone, p.input);
  } catch (e) {
    console.error(e);
    return { errors: { form: "failed" }, values: p.values };
  }
  redirect("/seller");
}
