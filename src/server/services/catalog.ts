import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { mainPrice, rankScore, type Filters } from "@/lib/catalog";
import { db } from "../db";
import { env } from "../env";
import { hit } from "../rate-limit";

export const PAGE_SIZE = 24;

/** What shoppers may see: not hidden by seller or admin, in a live shop. */
export const visibleProduct = {
  isHidden: false,
  hiddenByAdmin: false,
  design: { shop: { status: "approved" as const, deletedAt: null } },
} satisfies Prisma.ProductWhereInput;

const card = {
  id: true,
  code: true,
  titleEn: true,
  titleHi: true,
  isFeatured: true,
  lastSellerTouchAt: true,
  createdAt: true,
  images: { orderBy: { sortOrder: "asc" }, take: 1, select: { key: true } },
  sizes: { select: { stockCount: true, availableCount: true, freeFromDate: true } },
  design: {
    select: {
      rentPerDay: true,
      rentPerWeek: true,
      sellPrice: true,
      shop: { select: { shopName: true, slug: true, isVerified: true, area: { select: { nameEn: true, nameHi: true } } } },
    },
  },
} satisfies Prisma.ProductSelect;

export type CatalogCard = Prisma.ProductGetPayload<{ select: typeof card }>;

const some = (slugs: string[]) => (slugs.length ? { some: { slug: { in: slugs } } } : undefined);

/** Listing for home, shop page and Saved. Sorted and paged in memory. */
// shortcut: loads every matching product to rank in JS; fine for one city's few thousand dresses, move ranking to SQL beyond that.
export async function listCatalog(f: Filters, scope: { shopId?: string; codes?: string[] } = {}) {
  const ids = f.q ? await searchProductIds(f.q) : null;
  const where: Prisma.ProductWhereInput = {
    ...visibleProduct,
    ...(ids ? { id: { in: ids } } : {}),
    ...(scope.codes ? { code: { in: scope.codes } } : {}),
    colour: f.colour.length ? { slug: { in: f.colour } } : undefined,
    sizes: f.size.length ? { some: { size: { slug: { in: f.size } } } } : undefined,
    design: {
      shop: { status: "approved", deletedAt: null, ...(scope.shopId ? { id: scope.shopId } : {}), ...(f.area.length ? { area: { slug: { in: f.area } } } : {}) },
      category: f.category.length ? { slug: { in: f.category } } : undefined,
      occasions: some(f.occasion),
      forWhom: some(f.for),
      ageRanges: some(f.age),
      ...(f.mode === "rent" ? { OR: [{ rentPerDay: { not: null } }, { rentPerWeek: { not: null } }] } : {}),
      ...(f.mode === "buy" ? { sellPrice: { not: null } } : {}),
    },
  };
  const rows = await db.product.findMany({ where, select: card });

  const now = new Date();
  const price = (p: CatalogCard) => mainPrice(p.design)?.amount ?? 0;
  const inRange = rows.filter((p) => (f.min == null || price(p) >= f.min) && (f.max == null || price(p) <= f.max));
  const sorted = inRange.sort((a, b) => {
    if (f.sort === "newest") return b.createdAt.getTime() - a.createdAt.getTime();
    if (f.sort === "priceAsc") return price(a) - price(b);
    if (f.sort === "priceDesc") return price(b) - price(a);
    return rankScore(a, now, env.STALE_AFTER_DAYS) - rankScore(b, now, env.STALE_AFTER_DAYS) || b.createdAt.getTime() - a.createdAt.getTime();
  });
  return { items: sorted.slice(0, f.page * PAGE_SIZE), total: sorted.length };
}

/**
 * Product ids matching every word of `q` in titles, category, colour or occasion names (both languages).
 * Each word is expanded through SearchSynonym and matched by substring or trigram similarity, which
 * tolerates spellings like "lehnga".
 */
export async function searchProductIds(q: string): Promise<string[]> {
  const words = [...new Set(q.toLowerCase().split(/\s+/).filter(Boolean))].slice(0, 5);
  if (!words.length) return [];
  const synonyms = await db.searchSynonym.findMany({ where: { term: { in: words } } });
  const groups = words.map((w) => [w, ...synonyms.filter((s) => s.term === w).map((s) => s.target.toLowerCase())]);
  const match = (t: string) => Prisma.sql`(doc LIKE ${"%" + t.replace(/[\\%_]/g, "\\$&") + "%"} OR word_similarity(${t}, doc) > 0.5)`;
  const conds = groups.map((g) => Prisma.sql`(${Prisma.join(g.map(match), " OR ")})`);
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM (
      SELECT p.id, lower(concat_ws(' ', p."titleEn", p."titleHi", c."nameEn", c."nameHi", c.slug, co."nameEn", co."nameHi",
        (SELECT string_agg(o."nameEn" || ' ' || o."nameHi" || ' ' || o.slug, ' ')
           FROM "_DesignToOccasion" x JOIN "Occasion" o ON o.id = x."B" WHERE x."A" = d.id))) AS doc
      FROM "Product" p
      JOIN "Design" d ON d.id = p."designId"
      JOIN "Category" c ON c.id = d."categoryId"
      JOIN "Colour" co ON co.id = p."colourId"
      WHERE p."isHidden" = false AND p."hiddenByAdmin" = false
    ) s
    WHERE ${Prisma.join(conds, " AND ")}`;
  return rows.map((r) => r.id);
}

/** Option lists for the filter chips, plus the default city's areas. */
export async function listFacets() {
  const active = { where: { isActive: true }, orderBy: { sortOrder: "asc" as const }, select: { slug: true, nameEn: true, nameHi: true } };
  const [categories, occasions, colours, forWhom, sizes, ageRanges, city] = await Promise.all([
    db.category.findMany(active),
    db.occasion.findMany(active),
    db.colour.findMany({ ...active, select: { ...active.select, hex: true } }),
    db.forWhom.findMany(active),
    db.size.findMany(active),
    db.ageRange.findMany(active),
    db.city.findUnique({ where: { slug: env.DEFAULT_CITY_SLUG }, include: { areas: active } }),
  ]);
  return { categories, occasions, colours, forWhom, sizes, ageRanges, areas: city?.areas ?? [], city };
}

export function getProductByCode(code: string) {
  return db.product.findFirst({
    where: { ...visibleProduct, code },
    include: {
      colour: true,
      images: { orderBy: { sortOrder: "asc" } },
      sizes: { include: { size: true }, orderBy: { size: { sortOrder: "asc" } } },
      design: {
        include: {
          category: true,
          forWhom: true,
          ageRanges: true,
          occasions: true,
          setPieces: true,
          shop: { include: { area: true } },
          products: { where: { isHidden: false, hiddenByAdmin: false }, select: { code: true, colour: true }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
}

export function getShopBySlug(slug: string) {
  return db.shop.findFirst({ where: { slug, status: "approved", deletedAt: null }, include: { area: true, city: true } });
}

/** A view or WhatsApp click from a shopper's browser (sent with navigator.sendBeacon). */
export async function recordEvent(kind: "view" | "enquiry", code: string, sizeId: string | null, ip: string) {
  if (!(await hit(`event:${ip}`, 600, 3600))) return;
  const p = await db.product.findFirst({ where: { ...visibleProduct, code }, select: { id: true, sizes: { select: { sizeId: true } } } });
  if (!p) return;
  const size = sizeId && p.sizes.some((s) => s.sizeId === sizeId) ? sizeId : null;
  await db.$transaction([
    kind === "view" ? db.productView.create({ data: { productId: p.id } }) : db.enquiryClick.create({ data: { productId: p.id, sizeId: size } }),
    db.product.update({ where: { id: p.id }, data: kind === "view" ? { viewCount: { increment: 1 } } : { enquiryCount: { increment: 1 } } }),
  ]);
}

export const REPORT_REASONS = ["notAvailable", "wrongPrice", "wrongPhotos", "fake", "other"] as const;

/** Report a listing (SPEC §10). No login; rate-limited per IP. Returns false when over the limit. */
export async function reportProduct(code: string, reason: (typeof REPORT_REASONS)[number], ip: string) {
  if (!(await hit(`report:${ip}`, env.REPORT_MAX_PER_IP_PER_HOUR, 3600))) return false;
  const p = await db.product.findFirst({ where: { ...visibleProduct, code }, select: { id: true } });
  if (p) await db.report.create({ data: { productId: p.id, reason } });
  return true;
}
