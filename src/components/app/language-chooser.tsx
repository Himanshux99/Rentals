"use client";
import { useState, useSyncExternalStore } from "react";
import { Languages } from "lucide-react";
import { setLocale } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const KEY = "locale-chosen";

/** First-visit language pop-up (SPEC §11). The choice is kept in localStorage and in the locale cookie the server reads. */
export function LanguageChooser({ hasCookie }: { hasCookie: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const needsChoice = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return !hasCookie && !localStorage.getItem(KEY);
      } catch {
        return !hasCookie;
      }
    },
    () => false,
  );
  const open = needsChoice && !dismissed;

  async function choose(locale: "hi" | "en") {
    try {
      localStorage.setItem(KEY, locale);
    } catch {}
    setDismissed(true);
    await setLocale(locale);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && choose("hi")}>
      <DialogContent showCloseButton={false} className="gap-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Languages className="size-6" />
            भाषा चुनें / Choose language
          </DialogTitle>
        </DialogHeader>
        <Button onClick={() => choose("hi")} className="h-14 text-xl">
          हिंदी
        </Button>
        <Button onClick={() => choose("en")} variant="outline" className="h-14 text-xl">
          English
        </Button>
      </DialogContent>
    </Dialog>
  );
}
