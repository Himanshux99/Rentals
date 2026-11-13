"use client";
import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Building2, Camera, Crosshair, Loader2, MapPin, Phone, Store, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { chip } from "@/components/app/chip";
import { ImagePicker, type PickedImage } from "@/components/app/image-picker";
import type { OnboardingState } from "./shop-form";

type Place = { id: string; nameEn: string; nameHi: string };
type City = Place & { slug: string; areas: Place[] };
type Key = keyof NonNullable<OnboardingState["errors"]>;

/** Saved values for the settings page. */
export type ShopInitial = {
  shopName: string;
  ownerName: string;
  whatsapp: string; // 10 digits, or "" when it is the login number
  cityId: string;
  areaId: string;
  addressLine: string;
  pin: { lat: number; lng: number } | null;
  photo: { key: string; url: string } | null;
};

type Props = {
  action: (prev: OnboardingState, formData: FormData) => Promise<OnboardingState>;
  cities: City[];
  defaultCitySlug: string;
  /** The verified login number. Empty when an admin creates a shop: then the form asks for the seller's number. */
  loginPhone: string;
  maxEdge: number;
  initial?: ShopInitial;
  submitLabel?: "submit" | "saveSettings" | "createForShop";
  allowPhoto?: boolean;
};

/** Shop details: onboarding, seller settings and admin "create shop on behalf" (SPEC §4, §9). */
export function OnboardingForm({ action: serverAction, cities, defaultCitySlug, loginPhone, maxEdge, initial, submitLabel = "submit", allowPhoto = true }: Props) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const name = (p: Place) => (locale === "hi" ? p.nameHi : p.nameEn);
  const [state, action, pending] = useActionState<OnboardingState, FormData>(serverAction, {});
  const [cityId, setCityId] = useState(initial?.cityId ?? (cities.find((c) => c.slug === defaultCitySlug) ?? cities[0])?.id ?? "");
  const [areaId, setAreaId] = useState(initial?.areaId ?? "");
  const [same, setSame] = useState(!initial?.whatsapp);
  const [photo, setPhoto] = useState<PickedImage[]>(initial?.photo ? [{ id: "saved", preview: initial.photo.url, key: initial.photo.key, progress: 100 }] : []);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(initial?.pin ?? null);
  const v = (k: keyof ShopInitial) => state.values?.[k] ?? (typeof initial?.[k] === "string" ? (initial[k] as string) : undefined);
  const [pinState, setPinState] = useState<"idle" | "locating" | "failed">("idle");

  function locate() {
    setPinState("locating");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPin({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) });
        setPinState("idle");
      },
      () => setPinState("failed"),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }
  const city = cities.find((c) => c.id === cityId);
  const err = (k: Key) => {
    const key = state.errors?.[k];
    return key ? t(key) : null;
  };

  return (
    <form action={action} className="flex flex-col gap-8">
      <FieldGroup className="gap-6">
        <Field data-invalid={!!err("shopName")}>
          <FieldLabel htmlFor="shopName" className="gap-2 text-base">
            <Store className="size-5" />
            {t("shopName")}
          </FieldLabel>
          <Input id="shopName" name="shopName" defaultValue={v("shopName")} required maxLength={80} className="h-12 text-lg md:text-lg" />
          <FieldError>{err("shopName")}</FieldError>
        </Field>

        <Field data-invalid={!!err("ownerName")}>
          <FieldLabel htmlFor="ownerName" className="gap-2 text-base">
            <User className="size-5" />
            {t("ownerName")}
          </FieldLabel>
          <Input id="ownerName" name="ownerName" defaultValue={v("ownerName")} required maxLength={80} autoComplete="name" className="h-12 text-lg md:text-lg" />
          <FieldError>{err("ownerName")}</FieldError>
        </Field>

        <Field data-invalid={!!err("whatsapp")}>
          <FieldLabel className="gap-2 text-base">
            <Phone className="size-5" />
            {t("whatsapp")}
          </FieldLabel>
          {loginPhone ? (
            <label className="flex min-h-12 items-center gap-3 text-base">
              <Checkbox name="sameAsLogin" value="on" checked={same} onCheckedChange={(c) => setSame(!!c)} className="size-6" />
              {t("sameAsLogin", { phone: loginPhone.replace("+91", "+91 ") })}
            </label>
          ) : (
            <FieldDescription className="text-base">{t("sellerPhoneHelp")}</FieldDescription>
          )}
          {(!same || !loginPhone) && (
            <div className="flex items-stretch">
              <span className="flex h-12 items-center bg-muted px-4 text-lg tabular-nums">+91</span>
              <Input name="whatsapp" defaultValue={v("whatsapp")} inputMode="numeric" maxLength={10} required aria-label={t("whatsapp")} className="h-12 text-lg md:text-lg tabular-nums" />
            </div>
          )}
          <FieldError>{err("whatsapp")}</FieldError>
        </Field>

        <Field>
          <FieldLabel className="gap-2 text-base">
            <Building2 className="size-5" />
            {t("city")}
          </FieldLabel>
          <input type="hidden" name="cityId" value={cityId} />
          <ToggleGroup
            value={[cityId]}
            onValueChange={(v: string[]) => {
              if (v[0]) {
                setCityId(v[0]);
                setAreaId("");
              }
            }}
            className="flex-wrap"
          >
            {cities.map((c) => (
              <ToggleGroupItem key={c.id} value={c.id} className={chip}>
                {name(c)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Field data-invalid={!!err("areaId")}>
          <FieldLabel className="gap-2 text-base">
            <MapPin className="size-5" />
            {t("area")}
          </FieldLabel>
          <input type="hidden" name="areaId" value={areaId} />
          <ToggleGroup value={areaId ? [areaId] : []} onValueChange={(v: string[]) => setAreaId(v[0] ?? "")} className="flex-wrap">
            {city?.areas.map((a) => (
              <ToggleGroupItem key={a.id} value={a.id} className={chip}>
                {name(a)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldError>{err("areaId")}</FieldError>
        </Field>

        <Field data-invalid={!!err("addressLine")}>
          <FieldLabel htmlFor="addressLine" className="text-base">
            {t("address")}
          </FieldLabel>
          <Input id="addressLine" name="addressLine" defaultValue={v("addressLine")} required maxLength={200} autoComplete="street-address" className="h-12 text-lg md:text-lg" />
          <FieldDescription className="text-base">{t("addressHelp")}</FieldDescription>
          <FieldError>{err("addressLine")}</FieldError>
        </Field>

        <Field>
          <FieldLabel className="gap-2 text-base">
            <Crosshair className="size-5" />
            {t("pin")}
          </FieldLabel>
          <input type="hidden" name="mapLat" value={pin?.lat ?? ""} />
          <input type="hidden" name="mapLng" value={pin?.lng ?? ""} />
          <Button type="button" variant="outline" className="h-12 gap-2 text-base" onClick={locate} disabled={pinState === "locating"}>
            {pinState === "locating" ? <Loader2 className="size-5 animate-spin" /> : <MapPin className="size-5" />}
            {pin ? t("pinAgain") : t("pinUse")}
          </Button>
          <FieldDescription className="text-base">
            {pinState === "failed" ? t("pinFailed") : pin ? t("pinSaved") : t("pinHelp")}
          </FieldDescription>
        </Field>

        {allowPhoto && (
          <Field>
            <FieldLabel className="gap-2 text-base">
              <Camera className="size-5" />
              {t("photo")}
            </FieldLabel>
            <input type="hidden" name="shopPhotoKey" value={photo[0]?.key ?? ""} />
            <ImagePicker scope="shop" max={1} maxEdge={maxEdge} images={photo} setImages={setPhoto} />
            <FieldDescription className="text-base">{t("photoHelp")}</FieldDescription>
          </Field>
        )}
      </FieldGroup>

      {err("form") && (
        <p role="alert" className="text-base text-destructive">
          {err("form")}
        </p>
      )}
      <Button type="submit" className="h-14 text-lg" disabled={pending || photo.some((p) => !p.key && !p.failed)}>
        {pending && <Loader2 className="size-5 animate-spin" />}
        {pending ? t("submitting") : t(submitLabel)}
      </Button>
    </form>
  );
}
