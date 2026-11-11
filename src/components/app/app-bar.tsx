import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "./language-toggle";
import { Wordmark } from "./wordmark";

export async function AppBar({ signedIn = false, home = "/" }: { signedIn?: boolean; home?: string }) {
  const t = await getTranslations("common");
  return (
    <header className="flex items-center justify-between gap-2 px-4 py-2 sm:px-8">
      <Wordmark href={home} />
      <div className="flex items-center">
        <LanguageToggle />
        {signedIn && (
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" className="h-12 gap-2 px-3 text-base">
              <LogOut className="size-5" />
              <span className="sr-only sm:not-sr-only">{t("signOut")}</span>
            </Button>
          </form>
        )}
      </div>
    </header>
  );
}
