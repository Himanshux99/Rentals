import { env } from "@/server/env";
import { verifyUpload, writeLocal } from "@/server/storage/local";

// Stand-in for R2's presigned PUT when STORAGE_DRIVER=local.
export async function PUT(req: Request) {
  if (env.STORAGE_DRIVER !== "local") return new Response(null, { status: 404 });
  const ok = verifyUpload(new URL(req.url).searchParams);
  if (!ok) return new Response("bad or expired signature", { status: 403 });
  if (req.headers.get("content-type") !== ok.type) return new Response("content-type mismatch", { status: 400 });
  const data = Buffer.from(await req.arrayBuffer());
  if (data.length !== ok.bytes) return new Response("size mismatch", { status: 400 });
  await writeLocal(ok.key, data);
  return new Response(null, { status: 200 });
}
