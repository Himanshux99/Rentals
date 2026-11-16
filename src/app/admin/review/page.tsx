import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { ChipLink } from "@/components/app/chip-link";
import { SubmitButton } from "@/components/feedback/submit-button";
import { Input } from "@/components/ui/input";
import type { Moderation } from "@/lib/moderation";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { countPending, getDirectUpload, listQueue, type QueueFilter } from "@/server/services/moderation";
import { SettingSwitch } from "@/components/app/setting-switch";
import { setDirectUploadAction } from "../actions";
import { ReviewQueue } from "./review-queue";

export const metadata: Metadata = { title: "Review" };

const STATUSES: Moderation[] = ["pending", "approved", "rejected"];

// The review queue: filters are links (server-rendered first page); approving and rejecting happen in place.
export default async function AdminReview({ searchParams }: PageProps<"/admin/review">) {
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const f: QueueFilter = {
    status: STATUSES.includes(sp.status as Moderation) ? (sp.status as Moderation) : "pending",
    sort: sp.sort === "newest" ? "newest" : "oldest",
    category: str(sp.category).slice(0, 60) || null,
    q: str(sp.q).slice(0, 60),
  };
  const [t, locale, page, pending, directUpload, categories] = await Promise.all([
    getTranslations("moderation"),
    getLocale(),
    listQueue(f, null),
    countPending(),
    getDirectUpload(),
    db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, nameEn: true, nameHi: true } }),
  ]);
  const href = (patch: Partial<QueueFilter>) => {
    const m = { ...f, ...patch };
    const p = new URLSearchParams({ status: m.status, sort: m.sort, ...(m.category ? { category: m.category } : {}), ...(m.q ? { q: m.q } : {}) });
    return `/admin/review?${p}`;
  };

  return (
    <>
      <h1 className="text-4xl font-semibold">{t("title")}</h1>

      <SettingSwitch
        id="direct-upload"
        initial={directUpload}
        risky
        action={setDirectUploadAction}
        text={{
          title: t("directTitle"),
          onBody: t("directOnBody"),
          offBody: t("directOffBody"),
          onToast: t("directOnToast"),
          offToast: t("directOffToast"),
          confirmTitle: t("directConfirmTitle"),
          confirmBody: t("directConfirmBody"),
          confirm: t("directConfirm"),
          cancel: t("cancel"),
        }}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex flex-wrap gap-2" aria-label={t("title")}>
            {STATUSES.map((s) => (
              <Link
                key={s}
                href={href({ status: s })}
                aria-current={s === f.status ? "page" : undefined}
                className={cn("inline-flex h-12 items-center px-4 text-base", s === f.status ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}
              >
                {t(`status_${s}`)}
              </Link>
            ))}
          </nav>
          <form className="flex gap-2" role="search">
            <input type="hidden" name="status" value={f.status} />
            <input type="hidden" name="sort" value={f.sort} />
            {f.category && <input type="hidden" name="category" value={f.category} />}
            <Input name="q" defaultValue={f.q} placeholder={t("search")} aria-label={t("search")} className="h-12 text-base md:text-base" />
            <SubmitButton variant="outline" className="h-12" aria-label={t("search")}>
              <Search className="size-5" />
            </SubmitButton>
          </form>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <ChipLink href={href({ sort: f.sort === "oldest" ? "newest" : "oldest" })} active>
            {t(f.sort === "oldest" ? "sortOldest" : "sortNewest")}
          </ChipLink>
          <ChipLink href={href({ category: null })} active={!f.category}>
            {t("allCategories")}
          </ChipLink>
          {categories.map((c) => (
            <ChipLink key={c.slug} href={href({ category: c.slug })} active={f.category === c.slug}>
              {locale === "hi" ? c.nameHi : c.nameEn}
            </ChipLink>
          ))}
        </div>
      </div>

      {/* keyed on the filters so the client list starts over when they change */}
      <ReviewQueue key={href({})} filter={f} initial={page} pending={pending} />
    </>
  );
}
