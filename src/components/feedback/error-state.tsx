"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Something failed: say so, offer a retry and a way out. */
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const t = useTranslations("feedback");
  return (
    <section role="alert" className="mx-auto flex max-w-md flex-col items-start gap-3 px-4 py-16">
      <TriangleAlert className="size-10 text-[var(--gold)]" aria-hidden />
      <h1 className="text-3xl font-semibold">{t("errorTitle")}</h1>
      <p className="text-lg">{t("errorBody")}</p>
      <div className="flex flex-wrap gap-2">
        {onRetry && (
          <Button onClick={onRetry} className="h-12 text-base">
            {t("retry")}
          </Button>
        )}
        <Button variant="outline" nativeButton={false} render={<Link href="/" />} className="h-12 text-base">
          {t("home")}
        </Button>
      </div>
    </section>
  );
}
