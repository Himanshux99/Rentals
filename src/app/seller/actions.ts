"use server";
import { revalidatePath } from "next/cache";
import { requireLiveShop } from "@/server/seller";
import { changeAvailable, confirmFresh, deleteProduct, markSold, setFreeFrom, setHidden } from "@/server/services/products";

// Dashboard controls. Each is a plain <form> action, so it works before any JS has loaded.
async function run(fn: (shopId: string, actorId: string) => Promise<unknown>) {
  const { shop, user } = await requireLiveShop();
  await fn(shop.id, user.id);
  revalidatePath("/seller");
}

export async function availableAction(productSizeId: string, delta: 1 | -1) {
  await run((s, a) => changeAvailable(s, a, productSizeId, delta === 1 ? 1 : -1));
}

export async function freeFromAction(productSizeId: string, formData: FormData) {
  const v = String(formData.get("date") ?? "");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null;
  await run((s, a) => setFreeFrom(s, a, productSizeId, date));
}

export async function soldAction(productSizeId: string) {
  await run((s, a) => markSold(s, a, productSizeId));
}

export async function hideAction(productId: string, hidden: boolean) {
  await run((s, a) => setHidden(s, a, productId, hidden));
}

export async function confirmAction(productId: string) {
  await run((s, a) => confirmFresh(s, a, productId));
}

export async function deleteAction(productId: string) {
  await run((s, a) => deleteProduct(s, a, productId));
}
