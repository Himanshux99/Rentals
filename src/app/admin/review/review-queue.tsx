"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { BadgeCheck, Check, Inbox, Loader2, Maximize2, X } from "lucide-react";
import { chip } from "@/components/app/chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { REJECT_REASONS, type RejectReason } from "@/lib/moderation";
import { cn } from "@/lib/utils";
import type { Decision, QueueCursor, QueueFilter, QueueItem } from "@/server/services/moderation";
import { loadQueueAction, moderateAction } from "../actions";

type Page = { items: QueueItem[]; next: QueueCursor | null };
type Named = { nameEn: string; nameHi: string };

const TOP_UP_BELOW = 5;

/**
 * The review list. Decisions are optimistic: the item leaves at once and comes back with a Retry toast if the
 * request fails. The server re-checks status and version, so double clicks and two admins can't double-apply.
 */
export function ReviewQueue({ filter, initial, pending: initialPending }: { filter: QueueFilter; initial: Page; pending: number }) {
  const t = useTranslations("moderation");
  const tf = useTranslations("feedback");
  const [items, setItems] = useState(initial.items);
  const [next, setNext] = useState(initial.next);
  const [pending, setPending] = useState(initialPending);
  const [active, setActive] = useState(0);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState<QueueItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const busy = useRef(new Set<string>());
  const cards = useRef(new Map<string, HTMLElement>());
  const current = Math.min(active, items.length - 1);

  async function loadMore(cursor = next) {
    if (!cursor || loading) return;
    setLoading(true);
    setLoadError(false);
    try {
      const page = await loadQueueAction(filter, cursor);
      setItems((xs) => [...xs, ...page.items.filter((p) => !xs.some((x) => x.id === p.id))]);
      setNext(page.next);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function act(item: QueueItem, d: Decision) {
    if (busy.current.has(item.id)) return;
    busy.current.add(item.id);
    const index = items.findIndex((x) => x.id === item.id);
    setItems((xs) => xs.filter((x) => x.id !== item.id));
    setRejecting(null);
    setInspecting(null);
    if (item.moderation === "pending") setPending((n) => n - 1);
    if (items.length - 1 < TOP_UP_BELOW) void loadMore();
    try {
      const r = await moderateAction(item.id, item.moderation, item.version, d);
      if (r === "ok") toast.success(t(d.action === "approve" ? "approvedToast" : "rejectedToast", { code: item.code }));
      else toast.warning(t(r === "gone" ? "goneToast" : "staleToast", { code: item.code }), r === "stale" ? { action: { label: t("reload"), onClick: () => location.reload() } } : undefined);
    } catch {
      setItems((xs) => (xs.some((x) => x.id === item.id) ? xs : [...xs.slice(0, index), item, ...xs.slice(index)]));
      if (item.moderation === "pending") setPending((n) => n + 1);
      toast.error(tf("actionFailed"), { action: { label: t("retry"), onClick: () => act(item, d) } });
    } finally {
      busy.current.delete(item.id);
    }
  }

  const approve = (item: QueueItem) => act(item, { action: "approve" });
  const focusCard = (i: number) => {
    const item = items[Math.max(0, Math.min(i, items.length - 1))];
    if (item) cards.current.get(item.id)?.focus();
  };

  // J/K move, A approve, R reject, O details. Ignored while typing or in a dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if ((e.target as HTMLElement).closest("form, input, textarea, select, [contenteditable], [role=dialog]")) return;
      const item = items[current];
      if (!item) return;
      const key = e.key.toLowerCase();
      if (key === "j") focusCard(current + 1);
      else if (key === "k") focusCard(current - 1);
      else if (key === "a" && item.moderation !== "approved") void approve(item);
      else if (key === "r" && item.moderation !== "rejected") setRejecting(item.id);
      else if (key === "o") setInspecting(item);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section aria-label={t("title")} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-lg font-semibold tabular-nums" aria-live="polite">
          {t("pendingCount", { count: Math.max(0, pending) })}
        </p>
        <p className="hidden text-sm text-muted-foreground lg:block">{t("shortcuts")}</p>
      </div>

      {items.length === 0 && !next ? (
        <div className="flex flex-col items-start gap-3 bg-card px-6 py-10">
          <Inbox className="size-10 text-[var(--gold)]" aria-hidden />
          <p className="text-2xl font-semibold">{t(filter.status === "pending" ? "emptyPendingTitle" : "emptyTitle")}</p>
          {filter.status === "pending" && <p className="text-lg text-muted-foreground">{t("emptyPendingBody")}</p>}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item, i) => (
            <li key={item.id} className="flex flex-col">
              <ItemCard
                item={item}
                active={i === current}
                ref={(el) => {
                  if (el) cards.current.set(item.id, el);
                  else cards.current.delete(item.id);
                }}
                onFocus={() => setActive(i)}
                onApprove={() => approve(item)}
                onReject={() => setRejecting(item.id)}
                onInspect={() => setInspecting(item)}
              />
              {rejecting === item.id && (
                <RejectPanel
                  onCancel={() => {
                    setRejecting(null);
                    cards.current.get(item.id)?.focus();
                  }}
                  onReject={(reason, note) => act(item, { action: "reject", reason, note })}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {next && (
        <Button variant="outline" disabled={loading} onClick={() => loadMore()} className="h-12 w-fit gap-2 self-center text-base">
          {loading && <Loader2 className="size-5 animate-spin" />}
          {loadError ? t("loadFailed") : t("loadMore")}
        </Button>
      )}

      <Sheet open={!!inspecting} onOpenChange={(open) => !open && setInspecting(null)}>
        <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-2xl">
          {inspecting && (
            <>
              <SheetHeader className="pr-12">
                <SheetTitle className="text-2xl">
                  <Title item={inspecting} />
                </SheetTitle>
                <SheetDescription className="text-base">
                  {inspecting.code} · {inspecting.design.shop.shopName}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
                {inspecting.images.map((src, i) => (
                  <div key={src} className="relative aspect-[3/4] w-full bg-muted">
                    <Image src={src} alt={t("photoN", { n: i + 1 })} fill sizes="(min-width: 640px) 42rem, 100vw" className="object-contain" />
                  </div>
                ))}
                <Facts item={inspecting} full />
              </div>
              <SheetFooter className="flex-row border-t border-border">
                <Actions item={inspecting} onApprove={() => approve(inspecting)} 
                  onReject={() => {
                    setRejecting(inspecting.id);
                    setInspecting(null);
                  }}
                />
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function Title({ item }: { item: QueueItem }) {
  return useLocale() === "hi" ? item.titleHi : item.titleEn;
}

function ItemCard({
  item,
  active,
  ref,
  onFocus,
  onApprove,
  onReject,
  onInspect,
}: {
  item: QueueItem;
  active: boolean;
  ref: (el: HTMLElement | null) => void;
  onFocus: () => void;
  onApprove: () => void;
  onReject: () => void;
  onInspect: () => void;
}) {
  const t = useTranslations("moderation");
  return (
    <article
      ref={ref}
      tabIndex={0}
      onFocus={(e) => e.target === e.currentTarget && onFocus()}
      onClick={onFocus}
      aria-labelledby={`title-${item.id}`}
      className={cn("flex flex-col gap-4 bg-card p-4 outline-none lg:flex-row", active && "ring-2 ring-primary")}
    >
      <div className="flex gap-2 overflow-x-auto lg:w-[23rem] lg:shrink-0 lg:flex-wrap lg:content-start">
        {item.images.map((src, i) => (
          <button key={src} type="button" onClick={onInspect} aria-label={t("photoN", { n: i + 1 })} className="relative size-28 shrink-0 bg-muted">
            <Image src={src} alt="" fill sizes="7rem" className="object-cover" />
          </button>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id={`title-${item.id}`} className="text-xl font-semibold leading-snug">
            <Title item={item} />
          </h2>
          <span className="tabular-nums text-muted-foreground">{item.code}</span>
          <Flags item={item} />
        </div>
        <Facts item={item} />
      </div>
      <div className="flex flex-wrap gap-2 lg:w-44 lg:shrink-0 lg:flex-col">
        <Actions item={item} onApprove={onApprove} onReject={onReject} />
        <Button variant="ghost" onClick={onInspect} className="h-12 gap-2 text-base">
          <Maximize2 className="size-5" />
          {t("details")}
        </Button>
      </div>
    </article>
  );
}

function Actions({ item, onApprove, onReject }: { item: QueueItem; onApprove: () => void; onReject: () => void }) {
  const t = useTranslations("moderation");
  return (
    <>
      {item.moderation !== "approved" && (
        <Button onClick={onApprove} className="h-12 flex-1 gap-2 text-base lg:flex-none">
          <Check className="size-5" />
          {t("approve")}
        </Button>
      )}
      {item.moderation !== "rejected" && (
        <Button variant="outline" onClick={onReject} className="h-12 flex-1 gap-2 text-base text-destructive lg:flex-none">
          <X className="size-5" />
          {t(item.moderation === "approved" ? "unpublish" : "reject")}
        </Button>
      )}
    </>
  );
}

/** Status and anything a reviewer should notice before deciding. */
function Flags({ item }: { item: QueueItem }) {
  const t = useTranslations("moderation");
  const edited = new Date(item.version).getTime() - new Date(item.createdAt).getTime() > 1000;
  const reason = item.rejectReason && t.has(`reason_${item.rejectReason}`) ? t(`reason_${item.rejectReason}`) : item.rejectReason;
  return (
    <>
      <Badge variant={item.moderation === "approved" ? "default" : item.moderation === "rejected" ? "destructive" : "secondary"}>{t(`status_${item.moderation}`)}</Badge>
      {edited && <Badge variant="outline">{t("edited")}</Badge>}
      {reason && (
        <Badge variant={item.moderation === "rejected" ? "destructive" : "outline"} className="h-auto whitespace-normal">
          {t(item.moderation === "rejected" ? "rejectedFor" : "previouslyRejected", { reason })}
          {item.rejectNote && ` – “${item.rejectNote}”`}
        </Badge>
      )}
      {item._count.reports > 0 && <Badge variant="destructive">{t("openReports", { count: item._count.reports })}</Badge>}
      {item.isHidden && <Badge variant="outline">{t("sellerHidden")}</Badge>}
      {item.hiddenByAdmin && <Badge variant="outline">{t("adminHidden")}</Badge>}
      {item.design.shop.status !== "approved" && <Badge variant="outline">{t("shopNotLive")}</Badge>}
    </>
  );
}

function Facts({ item, full }: { item: QueueItem; full?: boolean }) {
  const t = useTranslations("moderation");
  const hi = useLocale() === "hi";
  const format = useFormatter();
  const name = (o: Named) => (hi ? o.nameHi : o.nameEn);
  const names = (list: Named[]) => list.map(name).join(", ");
  const rupees = (n: number) => format.number(n, { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const { design: d } = item;
  const prices = (
    [
      ["rentPerDay", d.rentPerDay],
      ["rentPerWeek", d.rentPerWeek],
      ["sellPrice", d.sellPrice],
      ["deposit", d.securityDeposit],
    ] as const
  ).filter(([, v]) => v != null);
  const more = [names(d.occasions), names(d.fabrics), names(d.works), names(d.setPieces)].filter(Boolean).join(" · ");
  const rows: [string, React.ReactNode][] = [
    [
      t("seller"),
      <span key="s" className="flex flex-wrap items-center gap-x-2">
        <a href={`/shop/${d.shop.slug}`} target="_blank" rel="noreferrer" className="font-medium underline-offset-4 hover:underline">
          {d.shop.shopName}
        </a>
        {d.shop.isVerified && <BadgeCheck className="size-4 text-[var(--gold)]" aria-label={t("verified")} />}
        <span className="text-muted-foreground">
          {d.shop.ownerName} · {name(d.shop.area)} ·{" "}
          <a href={`https://wa.me/${d.shop.whatsappPhone.replace("+", "")}`} target="_blank" rel="noreferrer" className="tabular-nums underline underline-offset-4">
            {d.shop.whatsappPhone}
          </a>
        </span>
      </span>,
    ],
    [t("category"), [name(d.category), names(d.forWhom), names(d.ageRanges)].filter(Boolean).join(" · ")],
    [t("price"), prices.map(([k, v]) => `${t(k)} ${rupees(v!)}`).join(" · ")],
    [t("sizes"), item.sizes.map((s) => `${name(s.size)} ×${s.stockCount}`).join(", ")],
    [
      t("colours"),
      <span key="c" className="flex flex-wrap items-center gap-2">
        {item.colours.map((c) => (
          <span key={c.hex + c.nameEn} className="flex items-center gap-1">
            <span className="size-4 rounded-full border border-border" style={{ backgroundColor: c.hex }} aria-hidden />
            {name(c)}
          </span>
        ))}
      </span>,
    ],
    ...(more ? [[t("more"), more] as [string, React.ReactNode]] : []),
    [t("submitted"), format.dateTime(new Date(item.version), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })],
  ];
  return (
    <>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-base">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="min-w-0">{v}</dd>
          </div>
        ))}
      </dl>
      {d.description ? (
        <p className={cn("whitespace-pre-line text-base", !full && "line-clamp-3")}>{d.description}</p>
      ) : (
        <p className="text-base italic text-muted-foreground">{t("noDescription")}</p>
      )}
    </>
  );
}

function RejectPanel({ onCancel, onReject }: { onCancel: () => void; onReject: (reason: RejectReason, note: string) => void }) {
  const t = useTranslations("moderation");
  const [reason, setReason] = useState<RejectReason | null>(null);
  const [note, setNote] = useState("");
  const submit = () => reason && onReject(reason, note);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
        // 1–6 pick a reason, unless typing the note
        const n = Number(e.key);
        if (e.target instanceof HTMLInputElement || !n || n > REJECT_REASONS.length) return;
        e.preventDefault();
        setReason(REJECT_REASONS[n - 1]);
      }}
      aria-label={t("rejectTitle")}
      className="flex flex-col gap-3 border-l-4 border-destructive bg-card px-4 pb-4"
    >
      <p className="text-base font-semibold">{t("rejectTitle")}</p>
      <ToggleGroup value={reason ? [reason] : []} onValueChange={(v: string[]) => setReason((v[0] as RejectReason) ?? null)} className="flex-wrap">
        {REJECT_REASONS.map((r, i) => (
          <ToggleGroupItem key={r} value={r} autoFocus={i === 0} className={chip}>
            <span className="tabular-nums text-muted-foreground in-data-[pressed]:text-primary-foreground">{i + 1}</span>
            {t(`reason_${r}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t("notePlaceholder")} aria-label={t("notePlaceholder")} className="h-12 text-base md:text-base" />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={!reason} className="h-12 gap-2 text-base">
          <X className="size-5" />
          {t("rejectConfirm")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="h-12 text-base">
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
