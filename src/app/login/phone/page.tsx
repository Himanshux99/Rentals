import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppBar } from "@/components/app/app-bar";
import { Stripe } from "@/components/app/stripe";
import { requireUser } from "@/server/auth";
import { PhoneForm } from "./phone-form";

export const metadata: Metadata = { title: "Mobile number" };

export default async function PhonePage() {
  const user = await requireUser();
  if (user.phoneVerified || user.role === "admin") redirect(user.role === "admin" ? "/admin" : "/seller");
  const t = await getTranslations("phone");

  return (
    <>
      <AppBar signedIn />
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center sm:pt-0">
        <section className="w-full max-w-[30rem] bg-card">
          <Stripe />
          <div className="flex flex-col gap-6 px-6 pb-8 pt-8 sm:px-10 sm:pb-10">
            <h1 className="text-4xl font-semibold sm:text-5xl">{t("title")}</h1>
            <p className="text-lg">{t("body")}</p>
            <PhoneForm />
          </div>
        </section>
      </main>
    </>
  );
}
