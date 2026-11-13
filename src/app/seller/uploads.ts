"use server";
import { z } from "zod";
import { productPrefix, shopPhotoPrefix } from "@/lib/upload-key";
import { requireRole } from "@/server/auth";
import { hit } from "@/server/rate-limit";
import { discardUploads, signImageUpload } from "@/server/services/uploads";
import { getShopForUser } from "@/server/services/shops";

export type UploadScope = "product" | "shop";

const file = z.object({ type: z.string(), bytes: z.number() });

// product images need a live shop; the shop photo is uploaded during onboarding, before the shop exists
async function prefixFor(scope: UploadScope) {
  const user = await requireRole("seller");
  if (scope === "shop") return { user, prefix: shopPhotoPrefix(user.id) };
  const shop = await getShopForUser(user.id, user.phoneNumber);
  if (shop?.status !== "approved") throw new Error("shop is not live");
  return { user, prefix: productPrefix(shop.id) };
}

export async function signUpload(scope: UploadScope, main: unknown, og?: unknown) {
  const { user, prefix } = await prefixFor(scope);
  if (!(await hit(`upload:${user.id}`, 300, 3600))) throw new Error("too many uploads");
  return signImageUpload(prefix, file.parse(main), og === undefined ? undefined : file.parse(og));
}

export async function discardUpload(scope: UploadScope, keys: unknown) {
  const { prefix } = await prefixFor(scope);
  await discardUploads(prefix, z.array(z.string()).max(4).parse(keys));
}
