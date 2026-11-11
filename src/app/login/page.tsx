import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppBar } from "@/components/app/app-bar";
import { Stripe } from "@/components/app/stripe";
import { getCurrentUser } from "@/server/auth";
import { GoogleButton } from "./google-button";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/login/phone");
  const [t, { error }] = await Promise.all([getTranslations("login"), searchParams]);

  return (
    <>
      <AppBar />
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center sm:pt-0">
        <section className="w-full max-w-[30rem] bg-card">
          <Stripe />
          <div className="flex flex-col gap-6 px-6 pb-8 pt-8 sm:px-10 sm:pb-10">
            <h1 className="text-[2.5rem] font-semibold sm:text-5xl">{t("title")}</h1>
            <p className="text-lg">{t("body")}</p>
            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{t("failed")}</AlertDescription>
              </Alert>
            )}
            <GoogleButton label={t("google")} />
            <p className="text-base text-muted-foreground">{t("note")}</p>
          </div>
        </section>
      </main>
      <footer className="px-4 pb-6 text-center sm:px-8">
        <Link href="/" className="inline-flex min-h-12 items-center text-base underline underline-offset-4">
          {t("browse")}
        </Link>
      </footer>
    </>
  );
}
