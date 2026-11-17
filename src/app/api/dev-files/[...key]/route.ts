import { env } from "@/server/env";
import { readLocal } from "@/server/storage/local";

const TYPES: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", mp4: "video/mp4", mov: "video/quicktime" };

// Serves locally stored uploads when STORAGE_DRIVER=local.
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (env.STORAGE_DRIVER !== "local") return new Response(null, { status: 404 });
  const key = (await params).key.join("/");
  try {
    const data = await readLocal(key);
    const headers: Record<string, string> = {
      "content-type": TYPES[key.split(".").pop()!.toLowerCase()] ?? "application/octet-stream",
      "cache-control": "public, max-age=3600",
      "accept-ranges": "bytes",
    };
    // Safari won't play a video unless the server answers Range requests with 206 (R2 does this itself).
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
    if (range && (range[1] || range[2])) {
      const size = data.length;
      const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start >= size || start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
      return new Response(new Uint8Array(data.subarray(start, end + 1)), { status: 206, headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}` } });
    }
    return new Response(new Uint8Array(data), { headers });
  } catch {
    return new Response(null, { status: 404 });
  }
}
