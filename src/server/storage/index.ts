import "server-only";
import { env } from "../env";
import { localStorage } from "./local";
import { r2Storage } from "./r2";

export type Storage = {
  /** Short-lived URL the browser PUTs the file to, locked to this type and exact size. */
  createUploadUrl(key: string, contentType: string, bytes: number): Promise<string>;
  /** Absolute URL for a stored key. */
  publicUrl(key: string): string;
  delete(key: string): Promise<void>;
};

export const ALLOWED_IMAGE_TYPES = ["image/webp", "image/jpeg"] as const;
export const MAX_UPLOAD_BYTES = env.NEXT_PUBLIC_IMAGE_MAX_UPLOAD_MB * 1024 * 1024;

export const storage: Storage = env.STORAGE_DRIVER === "r2" ? r2Storage() : localStorage();

/** `src` for <Image>: same-origin path for local files (next/image blocks localhost fetches), CDN URL otherwise. */
export const imageSrc = (key: string) => (env.STORAGE_DRIVER === "local" ? `/api/dev-files/${key}` : storage.publicUrl(key));
