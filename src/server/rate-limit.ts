import "server-only";
import { db } from "./db";

/** Fixed-window counter in Postgres. Returns false once `key` has been hit `max` times in the window. */
export async function hit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowSeconds * 1000);
  // One statement: start a new window if the old one ended, otherwise count up.
  const [row] = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowEnd") VALUES (${key}, 1, ${windowEnd})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowEnd" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowEnd" = CASE WHEN "RateLimit"."windowEnd" < ${now} THEN ${windowEnd} ELSE "RateLimit"."windowEnd" END
    RETURNING "count"`;
  return row.count <= max;
}

/** The caller's IP, for per-IP limits. Vercel and most proxies set x-forwarded-for. */
export async function clientIp() {
  const { headers } = await import("next/headers");
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
