import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { listOptions, listSynonyms, OPTION_LISTS, type OptionList, type OptionRow } from "@/server/services/admin";
import { cn } from "@/lib/utils";
import { addSynonymAction, deleteSynonymAction, saveOptionAction } from "../../actions";

export const metadata: Metadata = { title: "Option list" };

const field = "h-12 text-base md:text-base";

// Create, rename, reorder (sort number) and disable options in both languages (SPEC §9).
// Rows are disabled rather than deleted: products still point at them.
export default async function OptionListPage({ params, searchParams }: PageProps<"/admin/options/[list]">) {
  const { list } = await params;
  const t = await getTranslations("admin");

  if (list === "synonym") {
    const rows = await listSynonyms();
    return (
      <>
        <h1 className="text-4xl font-semibold">{t("list_synonym")}</h1>
        <p className="max-w-prose text-base text-muted-foreground">{t("synonymHelp")}</p>
        <form action={addSynonymAction} className="flex max-w-xl flex-wrap gap-2">
          <Input name="term" required placeholder={t("synonymTerm")} aria-label={t("synonymTerm")} className={cn(field, "w-40")} />
          <Input name="target" required placeholder={t("synonymTarget")} aria-label={t("synonymTarget")} className={cn(field, "w-40")} />
          <Button type="submit" className="h-12 gap-2 text-base">
            <Plus className="size-5" />
            {t("add")}
          </Button>
        </form>
        <ul className="flex max-w-xl flex-col gap-px bg-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between bg-card px-4">
              <span className="text-base">
                {r.term} → <span className="font-semibold">{r.target}</span>
              </span>
              <form action={deleteSynonymAction.bind(null, r.id)}>
                <Button type="submit" variant="ghost" className="h-12" aria-label={t("delete")}>
                  <Trash2 className="size-5" />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (!OPTION_LISTS.includes(list as OptionList)) notFound();
  const l = list as OptionList;
  let cityId: string | null = null;
  let cities: { id: string; nameEn: string; slug: string }[] = [];
  if (l === "area") {
    const sp = await searchParams;
    cities = await db.city.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, nameEn: true, slug: true } });
    const picked = cities.find((c) => c.id === sp.city) ?? cities.find((c) => c.slug === env.DEFAULT_CITY_SLUG) ?? cities[0];
    cityId = picked?.id ?? null;
    if (!cityId) notFound();
  }
  const rows = await listOptions(l, cityId ?? undefined);
  const labels = { colour: t("colour"), order: t("order"), active: t("active"), save: t("save"), add: t("add") };


  return (
    <>
      <h1 className="text-4xl font-semibold">{t(`list_${l}`)}</h1>
      {l === "area" && (
        <nav className="flex flex-wrap gap-2">
          {cities.map((c) => (
            <Link
              key={c.id}
              href={`/admin/options/area?city=${c.id}`}
              className={cn("inline-flex h-12 items-center px-4 text-base", c.id === cityId ? "bg-[var(--haldi)] text-[var(--haldi-ink)]" : "bg-card hover:bg-accent")}
            >
              {c.nameEn}
            </Link>
          ))}
        </nav>
      )}
      <p className="max-w-prose text-base text-muted-foreground">{t("optionsHelp")}</p>
      <div className="flex flex-col gap-px bg-border">
        {rows.map((r) => (
          <RowForm key={r.id} list={l} cityId={cityId} row={r} nextOrder={rows.length} labels={labels} />
        ))}
      </div>
      <h2 className="text-2xl font-semibold">{t("addNew")}</h2>
      <RowForm list={l} cityId={cityId} nextOrder={rows.length} labels={labels} />
    </>
  );
}

type RowProps = { list: OptionList; cityId: string | null; row?: OptionRow; nextOrder: number; labels: Record<"colour" | "order" | "active" | "save" | "add", string> };

/** One option as an inline form; without `row` it is the "add new" form. */
function RowForm({ list, cityId, row, nextOrder, labels }: RowProps) {
  return (
    <form action={saveOptionAction.bind(null, list, row?.id ?? null, cityId)} className="flex flex-wrap items-center gap-2 bg-card p-3">
      <Input name="nameEn" required maxLength={60} defaultValue={row?.nameEn} placeholder="English" aria-label="English" className={cn(field, "w-40")} />
      <Input name="nameHi" required maxLength={60} defaultValue={row?.nameHi} placeholder="हिंदी" aria-label="हिंदी" className={cn(field, "w-40")} />
      {list === "colour" && <Input name="hex" type="color" defaultValue={row?.hex ?? "#c79a3e"} aria-label={labels.colour} className="h-12 w-16 p-1" />}
      <Input name="sortOrder" type="number" min={0} max={9999} defaultValue={row?.sortOrder ?? nextOrder} aria-label={labels.order} className={cn(field, "w-20")} />
      <label className="flex h-12 items-center gap-2 text-base">
        <Checkbox name="isActive" value="on" defaultChecked={row?.isActive ?? true} className="size-6" />
        {labels.active}
      </label>
      <Button type="submit" variant={row ? "outline" : "default"} className="h-12 gap-2 text-base">
        {row ? <Save className="size-5" /> : <Plus className="size-5" />}
        {row ? labels.save : labels.add}
      </Button>
      {row && <span className="text-sm text-muted-foreground">{row.slug}</span>}
    </form>
  );
}
