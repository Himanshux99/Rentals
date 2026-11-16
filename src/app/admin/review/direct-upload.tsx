"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { setDirectUploadAction } from "../actions";

/** Direct Upload Mode. Turning it on (publishing without review) asks first; turning it off doesn't. */
export function DirectUploadSwitch({ initial }: { initial: boolean }) {
  const t = useTranslations("moderation");
  const tf = useTranslations("feedback");
  const [on, setOn] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [saving, start] = useTransition();

  const save = (value: boolean) =>
    start(async () => {
      setConfirming(false);
      setOn(value);
      try {
        await setDirectUploadAction(value);
        toast(t(value ? "directOnToast" : "directOffToast"));
      } catch {
        setOn(!value);
        toast.error(tf("actionFailed"));
      }
    });

  return (
    <section className={cn("flex flex-col gap-2 border-l-4 bg-card p-4", on ? "border-destructive" : "border-[var(--gold)]")}>
      <Label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 text-lg font-semibold">
        {t("directTitle")}
        <Switch checked={on} disabled={saving} aria-describedby="direct-upload-desc" onCheckedChange={(v) => (v ? setConfirming(true) : save(false))} />
      </Label>
      <p id="direct-upload-desc" className="text-base text-muted-foreground">
        {t(on ? "directOnBody" : "directOffBody")}
      </p>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="gap-5">
          <DialogHeader>
            <DialogTitle className="text-2xl">{t("directConfirmTitle")}</DialogTitle>
            <DialogDescription className="text-base">{t("directConfirmBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="destructive" onClick={() => save(true)} className="h-12 text-base">
              {t("directConfirm")}
            </Button>
            <DialogClose render={<Button variant="ghost" className="h-12 text-base" />}>{t("cancel")}</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
