import { timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";
import { resetFreeFromDates } from "@/server/services/products";

// Daily job (SPEC §14), called by Vercel Cron with `Authorization: Bearer $CRON_SECRET`.
// Stale ranking needs no job: it is computed from lastSellerTouchAt when the listing is built.
export async function GET(req: Request) {
  const want = Buffer.from(`Bearer ${env.CRON_SECRET ?? ""}`);
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  if (!env.CRON_SECRET || got.length !== want.length || !timingSafeEqual(got, want)) return new Response("unauthorized", { status: 401 });
  // free-from dates are shop-local (India) calendar days
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const reset = await resetFreeFromDates(today);
  return Response.json({ today, reset });
}
