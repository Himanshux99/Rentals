"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { sendOtp, verifyOtp } from "@/lib/auth-client";

const RESEND_SECONDS = 30;
const MOBILE = /^[6-9]\d{9}$/;

export function PhoneForm() {
  const t = useTranslations("phone");
  const router = useRouter();
  const [digits, setDigits] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function send(phone: string) {
    setBusy(true);
    setError(null);
    const res = await sendOtp(phone);
    setBusy(false);
    if (res.error) return setError(res.error);
    setSentTo(phone);
    setCode("");
    setWait(RESEND_SECONDS);
  }

  async function verify(value: string) {
    if (!sentTo || value.length !== 6) return;
    setBusy(true);
    setError(null);
    const res = await verifyOtp(sentTo, value);
    if (res.error) {
      setBusy(false);
      setCode("");
      return setError(t("wrongCode"));
    }
    router.replace("/seller");
    router.refresh();
  }

  if (!sentTo) {
    return (
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!MOBILE.test(digits)) return setError(t("invalid"));
          send(`+91${digits}`);
        }}
      >
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="phone" className="text-base">{t("label")}</FieldLabel>
          <div className="flex items-stretch">
            <span className="flex h-14 items-center bg-muted px-4 text-lg tabular-nums">+91</span>
            <Input
              id="phone"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, ""))}
              className="h-14 text-lg tracking-wide tabular-nums md:text-lg"
              aria-invalid={!!error}
              autoFocus
            />
          </div>
          <FieldError>{error}</FieldError>
        </Field>
        <Button type="submit" className="h-14 text-lg" disabled={busy}>
          {busy && <Loader2 className="size-5 animate-spin" />}
          {busy ? t("sending") : t("send")}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Field data-invalid={!!error}>
        <FieldLabel className="text-base">{t("codeTitle")}</FieldLabel>
        <FieldDescription className="text-base">{t("codeBody", { phone: sentTo.replace("+91", "+91 ") })}</FieldDescription>
        <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={verify} autoFocus inputMode="numeric">
          <InputOTPGroup>
            {Array.from({ length: 6 }, (_, i) => (
              <InputOTPSlot key={i} index={i} className="size-12 text-xl sm:size-14" />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <FieldError>{error}</FieldError>
      </Field>
      <Button className="h-14 text-lg" disabled={busy || code.length !== 6} onClick={() => verify(code)}>
        {busy && <Loader2 className="size-5 animate-spin" />}
        {busy ? t("verifying") : t("verify")}
      </Button>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" className="h-12 text-base" disabled={wait > 0 || busy} onClick={() => send(sentTo)}>
          {wait > 0 ? t("resendIn", { seconds: wait }) : t("resend")}
        </Button>
        <Button variant="ghost" className="h-12 text-base" onClick={() => { setSentTo(null); setError(null); }}>
          {t("change")}
        </Button>
      </div>
    </div>
  );
}
