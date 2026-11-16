"use client";
import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Camera, FileText, Gem, IndianRupee, Layers, Loader2, Minus, Palette, PartyPopper, Plus, Ruler, Scissors, Shirt, Tag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { chip } from "@/components/app/chip";
import { ImagePicker, type PickedImage } from "@/components/app/image-picker";
import { createDesignAction, updateProductAction, type ProductFormState } from "./actions";

type Opt = { id: string; nameEn: string; nameHi: string };
type Options = Record<"categories" | "forWhom" | "ageRanges" | "occasions" | "setPieces" | "fabrics" | "works" | "sizes", Opt[]> & { colours: (Opt & { hex: string })[] };
type Prices = Record<"rentPerDay" | "rentPerWeek" | "sellPrice" | "securityDeposit", string>;
/** Prefill for Edit (with photos and sizes) and Duplicate (choices only). */
export type ProductInitial = {
  categoryId: string;
  forWhomId: string;
  ageRangeIds: string[];
  occasionIds: string[];
  setPieceIds: string[];
  fabricIds: string[];
  workIds: string[];
  colourIds: string[];
  prices: Prices;
  description: string;
  images: PickedImage[];
  sizes: Record<string, number>;
};

const OFFERS = ["rentPerDay", "rentPerWeek", "sellPrice"] as const;
type Offer = (typeof OFFERS)[number];

const legend ="flex items-center gap-2 text-lg font-semibold";

type FormProps = { options: Options; maxImages: number; maxEdge: number; initial?: ProductInitial; productId?: string };

export function ProductForm({ options, maxImages, maxEdge, initial, productId }: FormProps) {
  const t = useTranslations("product");
  const locale = useLocale();
  const name = (o: Opt) => (locale === "hi" ? o.nameHi : o.nameEn);
  const [state, action, pending] = useActionState<ProductFormState, FormData>(productId ? updateProductAction : createDesignAction, {});

  const [images, setImages] = useState<PickedImage[]>(initial?.images ?? []);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [forWhomId, setForWhomId] = useState(initial?.forWhomId ?? "");
  const [colourIds, setColourIds] = useState<string[]>(initial?.colourIds ?? []);
  const [sizes, setSizes] = useState<Record<string, number>>(initial?.sizes ?? {});
  const [fabricIds, setFabricIds] = useState<string[]>(initial?.fabricIds ?? []);
  const [workIds, setWorkIds] = useState<string[]>(initial?.workIds ?? []);
  const [ageRangeIds, setAgeRangeIds] = useState<string[]>(initial?.ageRangeIds ?? []);
  const [occasionIds, setOccasionIds] = useState<string[]>(initial?.occasionIds ?? []);
  const [setPieceIds, setSetPieceIds] = useState<string[]>(initial?.setPieceIds ?? []);
  const [prices, setPrices] = useState<Prices>(initial?.prices ?? { rentPerDay: "", rentPerWeek: "", sellPrice: "", securityDeposit: "" });
  const [description, setDescription] = useState(initial?.description ?? "");
  // which prices the seller offers; a new dress starts with daily rent, an edit with whatever it already has
  const [offers, setOffers] = useState<Offer[]>(() => (initial ? OFFERS.filter((k) => initial.prices[k]) : ["rentPerDay"]));
  const rents = offers.includes("rentPerDay") || offers.includes("rentPerWeek");

  const uploading = images.some((i) => !i.key && !i.failed);
  const num = (s: string) => (s ? Number(s) : null);

  const payload = JSON.stringify({
    productId,
    categoryId,
    forWhomId,
    colourIds,
    fabricIds,
    workIds,
    ageRangeIds,
    occasionIds,
    setPieceIds,
    // a price the seller un-picked is dropped even if its box still holds a number
    rentPerDay: offers.includes("rentPerDay") ? num(prices.rentPerDay) : null,
    rentPerWeek: offers.includes("rentPerWeek") ? num(prices.rentPerWeek) : null,
    sellPrice: offers.includes("sellPrice") ? num(prices.sellPrice) : null,
    securityDeposit: rents ? num(prices.securityDeposit) : null,
    description: description.trim() || null,
    images: images.filter((i) => i.key && i.ogKey).map((i) => ({ key: i.key, ogKey: i.ogKey })),
    sizes: options.sizes.filter((s) => sizes[s.id]).map((s) => ({ sizeId: s.id, stock: sizes[s.id] })),
  });
  const err = (k: keyof NonNullable<ProductFormState["errors"]>) => (state.errors?.[k] ? t(state.errors[k]) : null);

  const chips = (list: Opt[], value: string[], onChange: (v: string[]) => void, multiple: boolean) => (
    <ToggleGroup multiple={multiple} value={value} onValueChange={onChange} className="flex-wrap">
      {list.map((o) => (
        <ToggleGroupItem key={o.id} value={o.id} className={chip}>
          {name(o)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
  const single = (set: (v: string) => void) => (v: string[]) => set(v[0] ?? "");
  const multi = (Icon: typeof Tag, label: string, list: Opt[], value: string[], onChange: (v: string[]) => void) => (
    <FieldSet>
      <FieldLegend className={legend}>
        <Icon className="size-5" />
        {label}
      </FieldLegend>
      <FieldDescription className="text-base">{t("pickAny")}</FieldDescription>
      {chips(list, value, onChange, true)}
    </FieldSet>
  );

  return (
    <form action={action} className="flex flex-col gap-10">
      <input type="hidden" name="payload" value={payload} />

      <FieldSet data-invalid={!!err("images")}>
        <FieldLegend className={legend}>
          <Camera className="size-5" />
          {t("photos")}
        </FieldLegend>
        <ImagePicker scope="product" max={maxImages} maxEdge={maxEdge} images={images} setImages={setImages} />
        <FieldError>{err("images")}</FieldError>
      </FieldSet>

      <FieldSet data-invalid={!!err("category")}>
        <FieldLegend className={legend}>
          <Tag className="size-5" />
          {t("category")}
        </FieldLegend>
        {chips(options.categories, categoryId ? [categoryId] : [], single(setCategoryId), false)}
        <FieldError>{err("category")}</FieldError>
      </FieldSet>

      <FieldSet data-invalid={!!err("forWhom")}>
        <FieldLegend className={legend}>
          <Users className="size-5" />
          {t("forWhom")}
        </FieldLegend>
        {chips(options.forWhom, forWhomId ? [forWhomId] : [], single(setForWhomId), false)}
        <FieldError>{err("forWhom")}</FieldError>
      </FieldSet>

      <FieldSet data-invalid={!!err("colours")}>
        <FieldLegend className={legend}>
          <Palette className="size-5" />
          {t("colours")}
        </FieldLegend>
        <FieldDescription className="text-base">{t("coloursHelp")}</FieldDescription>
        <ToggleGroup multiple value={colourIds} onValueChange={setColourIds} className="flex-wrap">
          {options.colours.map((c) => (
            <ToggleGroupItem key={c.id} value={c.id} className={chip}>
              <span className="size-5 rounded-full border border-border" style={{ backgroundColor: c.hex }} aria-hidden />
              {name(c)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldError>{err("colours")}</FieldError>
      </FieldSet>

      <FieldSet data-invalid={!!err("sizes")}>
        <FieldLegend className={legend}>
          <Ruler className="size-5" />
          {t("sizes")}
        </FieldLegend>
        <ToggleGroup
          multiple
          value={Object.keys(sizes)}
          onValueChange={(v: string[]) => setSizes((x) => Object.fromEntries(v.map((s) => [s, x[s] ?? 1])))}
          className="flex-wrap"
        >
          {options.sizes.map((s) => (
            <ToggleGroupItem key={s.id} value={s.id} className={chip}>
              {name(s)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {options.sizes
          .filter((s) => sizes[s.id])
          .map((s) => {
            const n = sizes[s.id];
            const set = (v: number) => setSizes((x) => ({ ...x, [s.id]: Math.min(99, Math.max(1, v)) }));
            return (
              <div key={s.id} className="flex items-center justify-between gap-3">
                <span className="text-lg">{t("stockFor", { size: name(s) })}</span>
                <div className="flex items-center">
                  <Button type="button" variant="outline" className="size-12" onClick={() => set(n - 1)} disabled={n <= 1} aria-label={t("less")}>
                    <Minus className="size-5" />
                  </Button>
                  <span className="w-12 text-center text-xl tabular-nums" aria-live="polite">
                    {n}
                  </span>
                  <Button type="button" variant="outline" className="size-12" onClick={() => set(n + 1)} disabled={n >= 99} aria-label={t("more")}>
                    <Plus className="size-5" />
                  </Button>
                </div>
              </div>
            );
          })}
        <FieldError>{err("sizes")}</FieldError>
      </FieldSet>

      {multi(Scissors, t("fabrics"), options.fabrics, fabricIds, setFabricIds)}
      {multi(Gem, t("works"), options.works, workIds, setWorkIds)}
      {multi(Shirt, t("ageRange"), options.ageRanges, ageRangeIds, setAgeRangeIds)}
      {multi(PartyPopper, t("occasions"), options.occasions, occasionIds, setOccasionIds)}
      {multi(Layers, t("setPieces"), options.setPieces, setPieceIds, setSetPieceIds)}

      <FieldSet data-invalid={!!err("price")}>
        <FieldLegend className={legend}>
          <IndianRupee className="size-5" />
          {t("price")}
        </FieldLegend>
        <FieldDescription className="text-base">{t("priceHelp")}</FieldDescription>
        <ToggleGroup multiple value={offers} onValueChange={(v: string[]) => setOffers(OFFERS.filter((k) => v.includes(k)))} className="flex-wrap">
          {OFFERS.map((k) => (
            <ToggleGroupItem key={k} value={k} className={chip}>
              {t(`offer_${k}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {[...offers, ...(rents ? (["securityDeposit"] as const) : [])].map((k) => (
          <label key={k} className="flex flex-col gap-1 text-base">
            {t(k)}
            <div className="flex items-stretch">
              <span className="flex h-12 items-center bg-muted px-4 text-lg">₹</span>
              <Input
                inputMode="numeric"
                maxLength={7}
                value={prices[k]}
                onChange={(e) => setPrices((p) => ({ ...p, [k]: e.target.value.replace(/\D/g, "") }))}
                className="h-12 text-lg tabular-nums md:text-lg"
              />
              {k !== "securityDeposit" && <span className="flex h-12 items-center bg-muted px-4 text-base">{t(`unit_${k}`)}</span>}
            </div>
          </label>
        ))}
        <FieldError className="text-base">{err("price")}</FieldError>
      </FieldSet>

      <FieldSet>
        <FieldLegend className={legend}>
          <FileText className="size-5" />
          {t("description")}
        </FieldLegend>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={4} className="text-lg md:text-lg" aria-label={t("description")} />
      </FieldSet>

      {err("form") && (
        <p role="alert" className="text-base text-destructive">
          {err("form")}
        </p>
      )}
      <Button type="submit" className="h-14 text-lg" disabled={pending || uploading}>
        {(pending || uploading) && <Loader2 className="size-5 animate-spin" />}
        {pending ? t("saving") : uploading ? t("waitUpload") : productId ? t("saveChanges") : t("save")}
      </Button>
    </form>
  );
}
