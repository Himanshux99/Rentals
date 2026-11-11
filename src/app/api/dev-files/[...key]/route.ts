import { env } from "@/server/env";
import { readLocal } from "@/server/storage/local";

const TYPES: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg" };

// Serves locally stored uploads when STORAGE_DRIVER=local.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (env.STORAGE_DRIVER !== "local") return new Response(null, { status: 404 });
  const key = (await params).key.join("/");
  try {
    const data = await readLocal(key);
    const type = TYPES[key.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";
    return new Response(new Uint8Array(data), { headers: { "content-type": type, "cache-control": "public, max-age=3600" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
