"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Text = { title: string; onBody: string; offBody: string; onToast: string; offToast: string; confirmTitle: string; confirmBody: string; confirm: string; cancel: string };

/** A site-wide admin toggle. Switching to the `risky` value (less review) asks first; switching back doesn't. */
export function SettingSwitch({ id, initial, risky, action, text }: { id: string; initial: boolean; risky: boolean; action: (value: boolean) => Promise<void>; text: Text }) {
  const tf = useTranslations("feedback");
  const [on, setOn] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [saving, start] = useTransition();

  const save = (value: boolean) =>
    start(async () => {
      setConfirming(false);
      setOn(value);
      try {
        await action(value);
        toast(value ? text.onToast : text.offToast);
      } catch {
        setOn(!value);
        toast.error(tf("actionFailed"));
      }
    });

  return (
    <section className={cn("flex flex-col gap-2 border-l-4 bg-card p-4", on === risky ? "border-destructive" : "border-[var(--gold)]")}>
      <Label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 text-lg font-semibold">
        {text.title}
        <Switch checked={on} disabled={saving} aria-describedby={`${id}-desc`} onCheckedChange={(v) => (v === risky ? setConfirming(true) : save(v))} />
      </Label>
      <p id={`${id}-desc`} className="text-base text-muted-foreground">
        {on ? text.onBody : text.offBody}
      </p>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="gap-5">
          <DialogHeader>
            <DialogTitle className="text-2xl">{text.confirmTitle}</DialogTitle>
            <DialogDescription className="text-base">{text.confirmBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="destructive" onClick={() => save(risky)} className="h-12 text-base">
              {text.confirm}
            </Button>
            <DialogClose render={<Button variant="ghost" className="h-12 text-base" />}>{text.cancel}</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
