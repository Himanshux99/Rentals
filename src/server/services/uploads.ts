import "server-only";
import { randomUUID } from "node:crypto";
import { isOwnKey } from "@/lib/upload-key";
import { db } from "../db";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, storage } from "../storage";

const EXT = { "image/webp": "webp", "image/jpeg": "jpg" } as const;

export type UploadFile = { type: string; bytes: number };

function check(f: UploadFile) {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(f.type)) throw new Error("bad image type");
  if (!Number.isInteger(f.bytes) || f.bytes < 1 || f.bytes > MAX_UPLOAD_BYTES) throw new Error("bad image size");
}

/** Signs one image under `prefix`: the main file and, when given, its OG JPEG. */
export async function signImageUpload(prefix: string, main: UploadFile, og?: UploadFile) {
  check(main);
  const id = randomUUID().replace(/-/g, "");
  const key = `${prefix}${id}.${EXT[main.type as keyof typeof EXT]}`;
  const url = await storage.createUploadUrl(key, main.type, main.bytes);
  if (!og) return { key, url };
  check(og);
  if (og.type !== "image/jpeg") throw new Error("OG image must be JPEG");
  const ogKey = `${prefix}${id}-og.jpg`;
  return { key, url, ogKey, ogUrl: await storage.createUploadUrl(ogKey, og.type, og.bytes) };
}

/** Deletes uploads the seller removed before saving. Keys already used by a product or shop are kept. */
export async function discardUploads(prefix: string, keys: string[]) {
  const own = keys.filter((k) => isOwnKey(k, prefix));
  if (!own.length) return;
  const [images, shops] = await Promise.all([
    db.productImage.findMany({ where: { OR: [{ key: { in: own } }, { ogKey: { in: own } }] }, select: { key: true, ogKey: true } }),
    db.shop.findMany({ where: { shopPhotoKey: { in: own } }, select: { shopPhotoKey: true } }),
  ]);
  const used = new Set([...images.flatMap((i) => [i.key, i.ogKey]), ...shops.map((s) => s.shopPhotoKey)]);
  await Promise.all(own.filter((k) => !used.has(k)).map((k) => storage.delete(k)));
}
