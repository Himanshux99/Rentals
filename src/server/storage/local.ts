import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../env";
import type { Storage } from ".";

// Debug adapter: files live on disk and go through /api/dev-upload and /api/dev-files,
// with an HMAC-signed URL so the upload flow matches R2's presigned PUT.

const root = path.resolve(env.STORAGE_LOCAL_DIR);
const SAFE_KEY = /^[a-z0-9][a-z0-9/_.-]*$/i;

export function resolveKey(key: string) {
  if (!SAFE_KEY.test(key) || key.includes("..")) throw new Error("bad key");
  return path.join(root, key);
}

function sign(key: string, type: string, bytes: number, exp: number) {
  return createHmac("sha256", env.AUTH_SECRET).update(`${key}|${type}|${bytes}|${exp}`).digest("hex");
}

export function verifyUpload(q: URLSearchParams) {
  const key = q.get("key") ?? "", type = q.get("type") ?? "", bytes = Number(q.get("bytes")), exp = Number(q.get("exp"));
  const sig = Buffer.from(q.get("sig") ?? "", "hex");
  const want = Buffer.from(sign(key, type, bytes, exp), "hex");
  const ok = sig.length === want.length && timingSafeEqual(sig, want) && Date.now() / 1000 < exp;
  return ok ? { key, type, bytes } : null;
}

export async function writeLocal(key: string, data: Buffer) {
  const file = resolveKey(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
}

export const readLocal = (key: string) => readFile(resolveKey(key));

export function localStorage(): Storage {
  return {
    async createUploadUrl(key, type, bytes) {
      resolveKey(key);
      const exp = Math.floor(Date.now() / 1000) + env.UPLOAD_URL_TTL_SECONDS;
      const q = new URLSearchParams({ key, type, bytes: String(bytes), exp: String(exp), sig: sign(key, type, bytes, exp) });
      return `${env.APP_URL}/api/dev-upload?${q}`;
    },
    publicUrl: (key) => `${env.APP_URL}/api/dev-files/${key}`,
    async delete(key) {
      await rm(resolveKey(key), { force: true });
    },
  };
}
