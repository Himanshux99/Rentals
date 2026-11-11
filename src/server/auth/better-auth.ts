import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { db } from "../db";
import { env } from "../env";
import { otp } from "../otp";
import { hit } from "../rate-limit";
import { INDIAN_MOBILE } from "@/lib/slug";

// Better Auth is only imported inside src/server/auth. Pages use ./index.ts.
export const auth = betterAuth({
  baseURL: env.APP_URL,
  secret: env.AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  session: { expiresIn: env.SESSION_MAX_AGE_DAYS * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  socialProviders: {
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, prompt: "select_account" },
  },
  user: {
    additionalFields: { role: { type: "string", input: false, defaultValue: "seller" } },
  },
  // Phone OTP only verifies a number on an existing Google session; it can never sign anyone in.
  disabledPaths: ["/sign-in/phone-number", "/phone-number/request-password-reset", "/phone-number/reset-password", "/sign-up/email", "/sign-in/email"],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Each SMS costs money: only a signed-in Google user may ask for a code.
      if (ctx.path === "/phone-number/send-otp" && !(await getSessionFromCtx(ctx)))
        throw new APIError("UNAUTHORIZED", { message: "Sign in with Google first." });
      if (ctx.path === "/phone-number/verify" && ctx.body?.updatePhoneNumber !== true)
        throw new APIError("FORBIDDEN", { message: "Phone numbers can only be verified while signed in with Google." });
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: { ...user, role: env.ADMIN_EMAILS.includes(user.email.toLowerCase()) ? "admin" : "seller" },
        }),
      },
    },
    session: {
      create: {
        // Google is mandatory: the OAuth callback is the only route allowed to start a session.
        before: async (_session, ctx) => (ctx?.path?.startsWith("/callback/") ? undefined : false),
      },
    },
  },
  plugins: [
    phoneNumber({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 5,
      phoneNumberValidator: (p) => INDIAN_MOBILE.test(p),
      sendOTP: async ({ phoneNumber, code }, ctx) => {
        const ip = ctx?.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        const okPhone = await hit(`otp:phone:${phoneNumber}`, env.OTP_MAX_PER_PHONE_PER_HOUR, 3600);
        const okIp = await hit(`otp:ip:${ip}`, env.OTP_MAX_PER_IP_PER_HOUR, 3600);
        if (!okPhone || !okIp) throw new APIError("TOO_MANY_REQUESTS", { message: "Too many codes requested. Try again in an hour." });
        await otp.send(phoneNumber, code);
      },
    }),
    nextCookies(), // must stay last
  ],
});
