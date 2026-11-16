import { getLocale, getTranslations } from "next-intl/server";
import { SubmitButton } from "@/components/feedback/submit-button";
import { Languages } from "lucide-react";
import { setLocale } from "@/app/actions";

export async function LanguageToggle() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("common")]);
  return (
    <form action={setLocale.bind(null, locale === "hi" ? "en" : "hi")}>
      <SubmitButton variant="ghost" aria-label={t("switchLanguageFull")} className="h-12 min-w-12 gap-2 px-2.5 text-base text-white hover:bg-white/10 hover:text-white">
        <Languages className="size-5 shrink-0" />
        <span lang={locale === "hi" ? "en" : "hi"}>{t("switchLanguage")}</span>
      </SubmitButton>
    </form>
  );
}
