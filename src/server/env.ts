import "server-only";
import { z } from "zod";

// All server config, checked once at startup. A missing value fails loudly here, not mid-request.
const int = (d: number) => z.coerce.number().int().positive().default(d);

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: z.url().default("http://localhost:3000"),

    DATABASE_URL: z.string().min(1),
    DB_DRIVER: z.enum(["pg", "neon"]).default("pg"),

    STORAGE_DRIVER: z.enum(["local", "r2"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default("./.uploads"),
    STORAGE_PUBLIC_BASE_URL: z.url().optional(),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    UPLOAD_URL_TTL_SECONDS: int(300),
    NEXT_PUBLIC_IMAGE_MAX_UPLOAD_MB: int(5),
    NEXT_PUBLIC_IMAGE_MAX_EDGE: int(1600),
    NEXT_PUBLIC_MAX_IMAGES_PER_PRODUCT: int(8),

    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    SESSION_MAX_AGE_DAYS: int(30),

    OTP_DRIVER: z.enum(["console", "msg91"]).default("console"),
    MSG91_AUTH_KEY: z.string().optional(),
    MSG91_TEMPLATE_ID: z.string().optional(),
    OTP_MAX_PER_PHONE_PER_HOUR: int(3),
    OTP_MAX_PER_IP_PER_HOUR: int(10),

    ADMIN_EMAILS: z
      .string()
      .default("")
      .transform((s) => s.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)),
    DEFAULT_CITY_SLUG: z.string().default("barwani"),
    REPORT_MAX_PER_IP_PER_HOUR: int(5),
    STALE_AFTER_DAYS: int(30),
    // protects /api/cron/daily; Vercel Cron sends it as a Bearer token
    CRON_SECRET: z.string().min(16).optional(),
  })
  .superRefine((e, ctx) => {
    const need = (keys: (keyof typeof e)[], why: string) =>
      keys.forEach((k) => !e[k] && ctx.addIssue({ code: "custom", path: [k], message: `required when ${why}` }));
    if (e.STORAGE_DRIVER === "r2")
      need(["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "STORAGE_PUBLIC_BASE_URL"], "STORAGE_DRIVER=r2");
    if (e.OTP_DRIVER === "msg91") need(["MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID"], "OTP_DRIVER=msg91");
    // Keyed on Vercel's production deploy, not NODE_ENV, so `next build` + `next start` still works locally.
    if (process.env.VERCEL_ENV === "production") {
      if (e.OTP_DRIVER === "console") ctx.addIssue({ code: "custom", path: ["OTP_DRIVER"], message: "console OTP is not allowed in production" });
      if (!e.CRON_SECRET) ctx.addIssue({ code: "custom", path: ["CRON_SECRET"], message: "required in production" });
      if (e.STORAGE_DRIVER === "local") ctx.addIssue({ code: "custom", path: ["STORAGE_DRIVER"], message: "local storage is not allowed in production" });
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error("Invalid environment:\n" + z.prettifyError(parsed.error));
}

export const env = parsed.data;
