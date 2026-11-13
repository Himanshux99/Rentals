import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { env } from "../env";
import { auth } from "./better-auth";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "seller" | "admin";
  phoneNumber: string | null;
  phoneVerified: boolean;
};

// The app's whole view of auth. Swapping the library means rewriting this file and better-auth.ts.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const u = s.user as typeof s.user & { role?: string; phoneNumber?: string | null; phoneNumberVerified?: boolean | null };
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image ?? null,
    role: u.role === "admin" ? "admin" : "seller",
    phoneNumber: u.phoneNumber ?? null,
    // With phone OTP off, a Google sign-in is enough; the seller's WhatsApp number stands in for the phone.
    phoneVerified: !!u.phoneNumberVerified || !env.PHONE_OTP_ENABLED,
  };
});

/** Signed in with Google. Sends to /login otherwise. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Signed in with a verified phone, and holding the role. */
export async function requireRole(role: "seller" | "admin") {
  const user = await requireUser();
  if (!user.phoneVerified && user.role !== "admin") redirect("/login/phone");
  if (role === "admin" && user.role !== "admin") redirect("/seller");
  return user;
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
}
