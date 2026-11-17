import "server-only";
import { randomUUID } from "node:crypto";
import { VIDEO_TYPES } from "@/lib/media";
import { isOwnKey } from "@/lib/upload-key";
import { db } from "../db";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, MAX_VIDEO_BYTES, storage } from "../storage";

const EXT = { "image/webp": "webp", "image/jpeg": "jpg", "video/mp4": "mp4", "video/quicktime": "mov" } as const;

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

/** Signs one video under `prefix`: the file as uploaded, the frame the seller picked (poster) and its OG JPEG. */
export async function signVideoUpload(prefix: string, video: UploadFile, poster: UploadFile, og: UploadFile) {
  if (!(VIDEO_TYPES as readonly string[]).includes(video.type)) throw new Error("bad video type");
  if (!Number.isInteger(video.bytes) || video.bytes < 1 || video.bytes > MAX_VIDEO_BYTES) throw new Error("bad video size");
  check(poster);
  check(og);
  if (og.type !== "image/jpeg") throw new Error("OG image must be JPEG");
  const id = randomUUID().replace(/-/g, "");
  const key = `${prefix}${id}.${EXT[video.type as keyof typeof EXT]}`;
  const posterKey = `${prefix}${id}-poster.${EXT[poster.type as keyof typeof EXT]}`;
  const ogKey = `${prefix}${id}-og.jpg`;
  const [url, posterUrl, ogUrl] = await Promise.all([
    storage.createUploadUrl(key, video.type, video.bytes),
    storage.createUploadUrl(posterKey, poster.type, poster.bytes),
    storage.createUploadUrl(ogKey, og.type, og.bytes),
  ]);
  return { key, url, posterKey, posterUrl, ogKey, ogUrl };
}

/** Deletes uploads the seller removed before saving. Keys already used by a product or shop are kept. */
export async function discardUploads(prefix: string, keys: string[]) {
  const own = keys.filter((k) => isOwnKey(k, prefix));
  if (!own.length) return;
  const [images, shops] = await Promise.all([
    db.productImage.findMany({ where: { OR: [{ key: { in: own } }, { ogKey: { in: own } }, { posterKey: { in: own } }] }, select: { key: true, ogKey: true, posterKey: true } }),
    db.shop.findMany({ where: { shopPhotoKey: { in: own } }, select: { shopPhotoKey: true } }),
  ]);
  const used = new Set([...images.flatMap((i) => [i.key, i.ogKey, i.posterKey ?? ""]), ...shops.map((s) => s.shopPhotoKey)]);
  await Promise.all(own.filter((k) => !used.has(k)).map((k) => storage.delete(k)));
}
