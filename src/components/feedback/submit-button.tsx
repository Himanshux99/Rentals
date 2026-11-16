"use client";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Submit button for server-action forms: disables itself while the action runs and shows a spinner without changing its size. */
export function SubmitButton({ children, disabled, className, ...props }: Omit<React.ComponentProps<typeof Button>, "type">) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} type="submit" disabled={disabled || pending} aria-busy={pending} className={`relative ${className ?? ""}`}>
      <span className={`inline-flex items-center gap-[inherit] ${pending ? "invisible" : ""}`}>{children}</span>
      {pending && <Loader2 aria-hidden className="absolute size-5 animate-spin motion-reduce:animate-none" />}
    </Button>
  );
}
