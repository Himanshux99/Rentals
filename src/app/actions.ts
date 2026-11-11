"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE } from "@/i18n/request";
import { signOut } from "@/server/auth";
import { redirect } from "next/navigation";

export async function setLocale(locale: "hi" | "en") {
  (await cookies()).set(LOCALE_COOKIE, locale === "en" ? "en" : "hi", { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}

export async function signOutAction() {
  await signOut();
  redirect("/login");
}
