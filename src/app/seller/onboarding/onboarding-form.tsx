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
import { createShopAction, type OnboardingState } from "./actions";

type Place = { id: string; nameEn: string; nameHi: string };
type City = Place & { slug: string; areas: Place[] };
type Key = keyof NonNullable<OnboardingState["errors"]>;


export function OnboardingForm(props: { cities: City[]; defaultCitySlug: string; loginPhone: string; maxEdge: number }) {
  const { cities, defaultCitySlug, loginPhone, maxEdge } = props;
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const name = (p: Place) => (locale === "hi" ? p.nameHi : p.nameEn);
  const [state, action, pending] = useActionState<OnboardingState, FormData>(createShopAction, {});
  const [cityId, setCityId] = useState((cities.find((c) => c.slug === defaultCitySlug) ?? cities[0])?.id ?? "");
  const [areaId, setAreaId] = useState("");
  const [same, setSame] = useState(true);
  const [photo, setPhoto] = useState<PickedImage[]>([]);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
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
          <Input id="shopName" name="shopName" defaultValue={state.values?.shopName} required maxLength={80} className="h-12 text-lg md:text-lg" />
          <FieldError>{err("shopName")}</FieldError>
        </Field>

        <Field data-invalid={!!err("ownerName")}>
          <FieldLabel htmlFor="ownerName" className="gap-2 text-base">
            <User className="size-5" />
            {t("ownerName")}
          </FieldLabel>
          <Input id="ownerName" name="ownerName" defaultValue={state.values?.ownerName} required maxLength={80} autoComplete="name" className="h-12 text-lg md:text-lg" />
          <FieldError>{err("ownerName")}</FieldError>
        </Field>

        <Field data-invalid={!!err("whatsapp")}>
          <FieldLabel className="gap-2 text-base">
            <Phone className="size-5" />
            {t("whatsapp")}
          </FieldLabel>
          <label className="flex min-h-12 items-center gap-3 text-base">
            <Checkbox name="sameAsLogin" value="on" checked={same} onCheckedChange={(v) => setSame(!!v)} className="size-6" />
            {t("sameAsLogin", { phone: loginPhone.replace("+91", "+91 ") })}
          </label>
          {!same && (
            <div className="flex items-stretch">
              <span className="flex h-12 items-center bg-muted px-4 text-lg tabular-nums">+91</span>
              <Input name="whatsapp" defaultValue={state.values?.whatsapp} inputMode="numeric" maxLength={10} required aria-label={t("whatsapp")} className="h-12 text-lg md:text-lg tabular-nums" />
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
          <Input id="addressLine" name="addressLine" defaultValue={state.values?.addressLine} required maxLength={200} autoComplete="street-address" className="h-12 text-lg md:text-lg" />
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

        <Field>
          <FieldLabel className="gap-2 text-base">
            <Camera className="size-5" />
            {t("photo")}
          </FieldLabel>
          <input type="hidden" name="shopPhotoKey" value={photo[0]?.key ?? ""} />
          <ImagePicker scope="shop" max={1} maxEdge={maxEdge} images={photo} setImages={setPhoto} />
          <FieldDescription className="text-base">{t("photoHelp")}</FieldDescription>
        </Field>
      </FieldGroup>

      {err("form") && (
        <p role="alert" className="text-base text-destructive">
          {err("form")}
        </p>
      )}
      <Button type="submit" className="h-14 text-lg" disabled={pending || photo.some((p) => !p.key && !p.failed)}>
        {pending && <Loader2 className="size-5 animate-spin" />}
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
