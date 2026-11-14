import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Heart, LogOut, Store } from "lucide-react";
import { signOutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { BackButton } from "./back-button";
import { LanguageToggle } from "./language-toggle";
import { Wordmark } from "./wordmark";

export async function AppBar({ signedIn = false, home = "/" }: { signedIn?: boolean; home?: string }) {
  const t = await getTranslations("common");
  return (
    <header className="flex items-center justify-between gap-2 px-4 py-2 sm:px-8">
      <div className="flex items-center gap-1">
        <BackButton label={t("back")} />
        <Wordmark href={home} />
      </div>
      <div className="flex items-center">
        {!signedIn && (
          <Button variant="ghost" nativeButton={false} render={<Link href="/saved" />} className="h-12 gap-2 px-3 text-base">
            <Heart className="size-5" />
            <span className="sr-only sm:not-sr-only">{t("saved")}</span>
          </Button>
        )}
        {!signedIn && (
          <Button variant="ghost" nativeButton={false} render={<Link href="/sell" />} className="h-12 gap-2 px-3 text-base">
            <Store className="size-5" />
            <span className="sr-only sm:not-sr-only">{t("sellerAccount")}</span>
          </Button>
        )}
        {signedIn && (
          <Button variant="ghost" nativeButton={false} render={<Link href="/" />} className="h-12 gap-2 px-3 text-base">
            <Store className="size-5" />
            <span className="sr-only sm:not-sr-only">{t("customerSite")}</span>
          </Button>
        )}
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
