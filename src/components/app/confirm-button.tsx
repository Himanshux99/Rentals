"use client";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** A destructive action behind a confirm dialog. `action` is a bound server action. */
export function ConfirmButton(props: {
  action: () => Promise<unknown>;
  trigger: React.ReactNode;
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" className={props.className} />}>{props.trigger}</DialogTrigger>
      <DialogContent className="gap-5">
        <DialogHeader>
          <DialogTitle className="text-2xl">{props.title}</DialogTitle>
          <DialogDescription className="text-base">{props.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await props.action();
                setOpen(false);
              })
            }
            className="h-12 text-base"
          >
            {pending && <Loader2 className="size-5 animate-spin" />}
            {props.confirm}
          </Button>
          <DialogClose render={<Button variant="ghost" className="h-12 text-base" />}>{props.cancel}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
