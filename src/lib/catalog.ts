// Shared, pure catalogue logic: price display, availability badge, ranking, WhatsApp links, filter URLs.

export type Prices = { rentPerDay: number | null; rentPerWeek: number | null; sellPrice: number | null };
export type SizeState = { stockCount: number; availableCount: number; freeFromDate: Date | null };

/** The one price a card shows, and the number sorting and price filters use. */
export function mainPrice(p: Prices): { amount: number; unit: "day" | "week" | "sale" } | null {
  if (p.rentPerDay != null) return { amount: p.rentPerDay, unit: "day" };
  if (p.rentPerWeek != null) return { amount: p.rentPerWeek, unit: "week" };
  if (p.sellPrice != null) return { amount: p.sellPrice, unit: "sale" };
  return null;
}

export type Availability = { kind: "available" } | { kind: "rented"; freeFrom: Date } | { kind: "allRented" };

/** "Available", "Rented — free from 12 Nov" or "All rented" (SPEC §7). */
export function availability(sizes: SizeState[]): Availability {
  if (sizes.some((s) => s.availableCount > 0)) return { kind: "available" };
  const dates = sizes.map((s) => s.freeFromDate).filter((d): d is Date => !!d);
  if (dates.length) return { kind: "rented", freeFrom: new Date(Math.min(...dates.map((d) => d.getTime()))) };
  return { kind: "allRented" };
}

export type Rankable = { sizes: SizeState[]; isFeatured: boolean; lastSellerTouchAt: Date; createdAt: Date };

/** Recommended order: available, then rented with a date, featured boosted, stale lower (SPEC §7). Lower sorts first. */
export function rankScore(p: Rankable, now: Date, staleDays: number) {
  const a = availability(p.sizes).kind;
  const stale = now.getTime() - p.lastSellerTouchAt.getTime() > staleDays * 86_400_000;
  return (a === "available" ? 0 : a === "rented" ? 4 : 8) + (p.isFeatured ? 0 : 1) + (stale ? 2 : 0);
}

export function isStale(lastSellerTouchAt: Date, now: Date, staleDays: number) {
  return now.getTime() - lastSellerTouchAt.getTime() > staleDays * 86_400_000;
}

const LINES = {
  hi: { hello: "Namaste 🙏 Mujhe yeh dress chahiye:", code: "Code", size: "Size", ask: "Kya yeh available hai?" },
  en: { hello: "Namaste 🙏 I'd like this dress:", code: "Code", size: "Size", ask: "Is it available?" },
};

/** The pre-filled enquiry (SPEC §8). The URL must be in it so WhatsApp shows the photo preview. */
export function enquiryMessage(locale: "hi" | "en", p: { title: string; code: string; url: string; size?: string | null }) {
  const l = LINES[locale];
  return [l.hello, `👗 ${p.title}`, `🔖 ${l.code}: ${p.code}`, p.size ? `📏 ${l.size}: ${p.size}` : null, `🔗 ${p.url}`, l.ask]
    .filter(Boolean)
    .join("\n");
}

// api.whatsapp.com/send, not wa.me: wa.me redirects there and the hop garbles 4-byte emoji (🙏 👗) into �
// on WhatsApp Web/Desktop. It opens the app on phones and falls back to WhatsApp Web on desktop, like wa.me.
/** +91XXXXXXXXXX → WhatsApp chat link with pre-filled text. */
export const waLink = (phone: string, text: string) => `https://api.whatsapp.com/send?phone=${phone.replace(/\D/g, "")}&text=${encodeURIComponent(text)}`;
export const waShare = (text: string) => `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

// ---------- Listing filters, kept in the URL so chips are plain links ----------

export const LIST_KEYS = ["occasion", "category", "colour", "for", "size", "age", "area"] as const;
export type ListKey = (typeof LIST_KEYS)[number];
export const SORTS = ["recommended", "newest", "priceAsc", "priceDesc"] as const;
export type Sort = (typeof SORTS)[number];

export type Filters = Record<ListKey, string[]> & {
  q: string;
  min: number | null;
  max: number | null;
  mode: "rent" | "buy" | null;
  sort: Sort;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const num = (v: string) => (/^\d{1,7}$/.test(v) ? Number(v) : null);

export function parseFilters(sp: Params): Filters {
  const lists = Object.fromEntries(
    LIST_KEYS.map((k) => [k, first(sp[k]).split(",").filter((s) => /^[a-z0-9-]{1,40}$/.test(s)).slice(0, 20)]),
  ) as Record<ListKey, string[]>;
  const sort = first(sp.sort) as Sort;
  const mode = first(sp.mode);
  return {
    ...lists,
    q: first(sp.q).trim().slice(0, 80),
    min: num(first(sp.min)),
    max: num(first(sp.max)),
    mode: mode === "rent" || mode === "buy" ? mode : null,
    sort: SORTS.includes(sort) ? sort : "recommended",
    page: Math.min(50, Math.max(1, num(first(sp.page)) ?? 1)),
  };
}

/** Query string for `f` with `change` applied. Resets paging. */
export function filterHref(path: string, f: Filters, change: Partial<Filters>) {
  const next = { ...f, page: 1, ...change };
  const q = new URLSearchParams();
  for (const k of LIST_KEYS) if (next[k].length) q.set(k, next[k].join(","));
  if (next.q) q.set("q", next.q);
  if (next.min != null) q.set("min", String(next.min));
  if (next.max != null) q.set("max", String(next.max));
  if (next.mode) q.set("mode", next.mode);
  if (next.sort !== "recommended") q.set("sort", next.sort);
  if (next.page > 1) q.set("page", String(next.page));
  const s = q.toString().replace(/%2C/g, ",");
  return s ? `${path}?${s}` : path;
}

export const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
