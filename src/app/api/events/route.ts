import { z } from "zod";
import { clientIp } from "@/server/rate-limit";
import { recordEvent } from "@/server/services/catalog";

const body = z.object({ kind: z.enum(["view", "enquiry"]), code: z.string().regex(/^R\d{1,9}$/), sizeId: z.string().max(40).nullish() });

// Receives navigator.sendBeacon from product pages; the response is never read.
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (parsed.success) await recordEvent(parsed.data.kind, parsed.data.code, parsed.data.sizeId ?? null, await clientIp());
  return new Response(null, { status: 204 });
}
