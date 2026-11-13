"use server";
import { z } from "zod";
import { productPrefix, shopPhotoPrefix } from "@/lib/upload-key";
import { hit } from "@/server/rate-limit";
import { discardUploads, signImageUpload } from "@/server/services/uploads";
import { getSellerContext } from "@/server/seller";

export type UploadScope = "product" | "shop";

const file = z.object({ type: z.string(), bytes: z.number() });

// product images need a live shop; the shop photo is uploaded during onboarding, before the shop exists
async function prefixFor(scope: UploadScope) {
  const { user, shop } = await getSellerContext();
  // a shop photo for an existing shop (settings) lives under the shop; during onboarding, under the user
  if (scope === "shop") return { user, prefix: shop ? shopPhotoPrefix(shop.id) : shopPhotoPrefix(user.id) };
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
