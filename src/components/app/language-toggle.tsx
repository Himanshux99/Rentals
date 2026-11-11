import { getLocale, getTranslations } from "next-intl/server";
import { Languages } from "lucide-react";
import { setLocale } from "@/app/actions";
import { Button } from "@/components/ui/button";

export async function LanguageToggle() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("common")]);
  return (
    <form action={setLocale.bind(null, locale === "hi" ? "en" : "hi")}>
      <Button type="submit" variant="ghost" className="h-12 gap-2 px-3 text-base">
        <Languages className="size-5" />
        {t("switchLanguage")}
      </Button>
    </form>
  );
}
