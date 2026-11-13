"use client";
import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, FileText, IndianRupee, Layers, Loader2, Minus, Palette, PartyPopper, Plus, Ruler, Shirt, Tag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { chip } from "@/components/app/chip";
import { ImagePicker, type PickedImage } from "@/components/app/image-picker";
import { createDesignAction, type ProductFormState } from "./actions";

type Opt = { id: string; nameEn: string; nameHi: string };
type Options = Record<"categories" | "forWhom" | "ageRanges" | "occasions" | "setPieces" | "sizes", Opt[]> & { colours: (Opt & { hex: string })[] };
type PerColour = { images: PickedImage[]; sizes: Record<string, number> };
type Prices = Record<"rentPerDay" | "rentPerWeek" | "sellPrice" | "securityDeposit", string>;

const legend = "flex items-center gap-2 text-lg font-semibold";
const empty: PerColour = { images: [], sizes: {} };

export function ProductForm({ options, maxImages, maxEdge }: { options: Options; maxImages: number; maxEdge: number }) {
  const t = useTranslations("product");
  const locale = useLocale();
  const name = (o: Opt) => (locale === "hi" ? o.nameHi : o.nameEn);
  const [state, action, pending] = useActionState<ProductFormState, FormData>(createDesignAction, {});

  const [categoryId, setCategoryId] = useState("");
  const [forWhomId, setForWhomId] = useState("");
  const [ageRangeIds, setAgeRangeIds] = useState<string[]>([]);
  const [occasionIds, setOccasionIds] = useState<string[]>([]);
  const [setPieceIds, setSetPieceIds] = useState<string[]>([]);
  const [colourIds, setColourIds] = useState<string[]>([]);
  // kept for deselected colours too, so re-tapping a colour brings its photos back
  const [perColour, setPerColour] = useState<Record<string, PerColour>>({});
  const [prices, setPrices] = useState<Prices>({ rentPerDay: "", rentPerWeek: "", sellPrice: "", securityDeposit: "" });
  const [description, setDescription] = useState("");

  const colour = (id: string) => perColour[id] ?? empty;
  const updateColour = (id: string, fn: (c: PerColour) => PerColour) => setPerColour((p) => ({ ...p, [id]: fn(p[id] ?? empty) }));
  const uploading = colourIds.some((id) => colour(id).images.some((i) => !i.key && !i.failed));
  const num = (s: string) => (s ? Number(s) : null);

  const payload = JSON.stringify({
    categoryId,
    forWhomId,
    ageRangeIds,
    occasionIds,
    setPieceIds,
    rentPerDay: num(prices.rentPerDay),
    rentPerWeek: num(prices.rentPerWeek),
    sellPrice: num(prices.sellPrice),
    securityDeposit: num(prices.securityDeposit),
    description: description.trim() || null,
    colours: colourIds.map((colourId) => ({
      colourId,
      images: colour(colourId).images.filter((i) => i.key && i.ogKey).map((i) => ({ key: i.key, ogKey: i.ogKey })),
      sizes: options.sizes.filter((s) => colour(colourId).sizes[s.id]).map((s) => ({ sizeId: s.id, stock: colour(colourId).sizes[s.id] })),
    })),
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

  return (
    <form action={action} className="flex flex-col gap-10">
      <input type="hidden" name="payload" value={payload} />

      <FieldSet data-invalid={!!err("category")}>
        <FieldLegend className={legend}>
          <Tag className="size-5" />
          {t("category")}
        </FieldLegend>
        {chips(options.categories, categoryId ? [categoryId] : [], single(setCategoryId), false)}
        <FieldError>{err("category")}</FieldError>
      </FieldSet>

      <FieldSet>
        <FieldLegend className={legend}>
          <Users className="size-5" />
          {t("forWhom")}
        </FieldLegend>
        {chips(options.forWhom, forWhomId ? [forWhomId] : [], single(setForWhomId), false)}
        <FieldError>{err("forWhom")}</FieldError>
      </FieldSet>

      <FieldSet>
        <FieldLegend className={legend}>
          <Shirt className="size-5" />
          {t("ageRange")}
        </FieldLegend>
        <FieldDescription className="text-base">{t("pickAny")}</FieldDescription>
        {chips(options.ageRanges, ageRangeIds, setAgeRangeIds, true)}
      </FieldSet>

      <FieldSet>
        <FieldLegend className={legend}>
          <PartyPopper className="size-5" />
          {t("occasions")}
        </FieldLegend>
        <FieldDescription className="text-base">{t("pickAny")}</FieldDescription>
        {chips(options.occasions, occasionIds, setOccasionIds, true)}
      </FieldSet>

      <FieldSet>
        <FieldLegend className={legend}>
          <Layers className="size-5" />
          {t("setPieces")}
        </FieldLegend>
        <FieldDescription className="text-base">{t("pickAny")}</FieldDescription>
        {chips(options.setPieces, setPieceIds, setSetPieceIds, true)}
      </FieldSet>

      <FieldSet>
        <FieldLegend className={legend}>
          <Palette className="size-5" />
          {t("colours")}
        </FieldLegend>
        <FieldDescription className="text-base">{t("coloursHelp")}</FieldDescription>
        <ToggleGroup multiple value={colourIds} onValueChange={setColourIds} className="flex-wrap gap-3">
          {options.colours.map((c) => (
            <ToggleGroupItem key={c.id} value={c.id} className="group h-auto w-16 flex-col gap-1 p-1 text-sm hover:bg-transparent aria-pressed:bg-transparent">
              <span
                className="flex size-12 items-center justify-center rounded-full border-2 border-border group-aria-pressed:ring-4 group-aria-pressed:ring-[var(--haldi)]"
                style={{ backgroundColor: c.hex }}
              >
                <Check className="hidden size-6 text-white mix-blend-difference group-aria-pressed:block" />
              </span>
              <span className="whitespace-normal text-center leading-tight">{name(c)}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldError>{err("colours")}</FieldError>
      </FieldSet>

      {colourIds.map((cid) => {
        const c = options.colours.find((x) => x.id === cid)!;
        const pc = colour(cid);
        const colourErr = state.colourErrors?.[cid];
        return (
          <section key={cid} className="flex flex-col gap-6 border-l-4 border-[var(--haldi)] bg-muted/40 py-4 pl-4 pr-2" aria-label={name(c)}>
            <h2 className="flex items-center gap-3 text-2xl font-semibold">
              <span className="size-8 rounded-full border-2 border-border" style={{ backgroundColor: c.hex }} aria-hidden />
              {name(c)}
            </h2>

            <FieldSet>
              <FieldLegend className={legend}>{t("photos")}</FieldLegend>
              <ImagePicker
                scope="product"
                max={maxImages}
                maxEdge={maxEdge}
                images={pc.images}
                setImages={(fn) => updateColour(cid, (x) => ({ ...x, images: fn(x.images) }))}
              />
            </FieldSet>

            <FieldSet>
              <FieldLegend className={legend}>
                <Ruler className="size-5" />
                {t("sizes")}
              </FieldLegend>
              <ToggleGroup
                multiple
                value={Object.keys(pc.sizes)}
                onValueChange={(v: string[]) => updateColour(cid, (x) => ({ ...x, sizes: Object.fromEntries(v.map((s) => [s, x.sizes[s] ?? 1])) }))}
                className="flex-wrap"
              >
                {options.sizes.map((s) => (
                  <ToggleGroupItem key={s.id} value={s.id} className={chip}>
                    {name(s)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {options.sizes
                .filter((s) => pc.sizes[s.id])
                .map((s) => {
                  const n = pc.sizes[s.id];
                  const set = (v: number) => updateColour(cid, (x) => ({ ...x, sizes: { ...x.sizes, [s.id]: Math.min(99, Math.max(1, v)) } }));
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
            </FieldSet>
            {colourErr && <FieldError className="text-base">{t(colourErr)}</FieldError>}
          </section>
        );
      })}

      <FieldSet>
        <FieldLegend className={legend}>
          <IndianRupee className="size-5" />
          {t("price")}
        </FieldLegend>
        <FieldDescription className="text-base">{t("priceHelp")}</FieldDescription>
        {(["rentPerDay", "rentPerWeek", "sellPrice", "securityDeposit"] as const).map((k) => (
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
        {pending ? t("saving") : uploading ? t("waitUpload") : t("save", { count: Math.max(1, colourIds.length) })}
      </Button>
    </form>
  );
}
