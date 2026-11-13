"use server";
import { clientIp } from "@/server/rate-limit";
import { REPORT_REASONS, reportProduct } from "@/server/services/catalog";

export async function reportAction(code: string, reason: string): Promise<"ok" | "limited"> {
  const r = REPORT_REASONS.find((x) => x === reason) ?? "other";
  return (await reportProduct(String(code).slice(0, 12), r, await clientIp())) ? "ok" : "limited";
}
