import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import { AppBar } from "@/components/app/app-bar";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("feedback");
  return (
    <>
      <AppBar />
      <main className="mx-auto flex max-w-md flex-1 flex-col items-start gap-3 px-4 py-16">
        <SearchX className="size-10 text-[var(--gold)]" aria-hidden />
        <h1 className="text-3xl font-semibold">{t("notFoundTitle")}</h1>
        <p className="text-lg">{t("notFoundBody")}</p>
        <Button nativeButton={false} render={<Link href="/" />} className="h-12 text-base">
          {t("home")}
        </Button>
      </main>
    </>
  );
}
