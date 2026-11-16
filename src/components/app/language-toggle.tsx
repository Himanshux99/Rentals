import { getLocale, getTranslations } from "next-intl/server";
import { Languages } from "lucide-react";
import { setLocale } from "@/app/actions";
import { Button } from "@/components/ui/button";

export async function LanguageToggle() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("common")]);
  return (
    <form action={setLocale.bind(null, locale === "hi" ? "en" : "hi")}>
      <Button type="submit" variant="ghost" className="h-12 min-w-12 gap-2 px-2.5 text-base text-white hover:bg-white/10 hover:text-white">
        <Languages className="size-5 shrink-0" />
        {t("switchLanguage")}
      </Button>
    </form>
  );
}
