import "server-only";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env";
import type { Storage } from ".";

// Cloudflare R2 over its S3 API. Any S3-compatible store works by changing the endpoint.
export function r2Storage(): Storage {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
  });
  const bucket = env.R2_BUCKET!;
  const base = env.STORAGE_PUBLIC_BASE_URL!.replace(/\/$/, "");

  return {
    async createUploadUrl(key, contentType, bytes) {
      // ContentLength and ContentType are signed, so the upload must match them exactly.
      const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: bytes });
      return getSignedUrl(client, cmd, { expiresIn: env.UPLOAD_URL_TTL_SECONDS, signableHeaders: new Set(["content-type", "content-length"]) });
    },
    publicUrl: (key) => `${base}/${key}`,
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
