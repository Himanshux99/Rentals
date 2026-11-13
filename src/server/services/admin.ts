import "server-only";
import { slugBase } from "@/lib/slug";
import type { ReportStatus } from "@/generated/prisma/client";
import { db } from "../db";
import { audit } from "./audit";

// ---------- Products (SPEC §9: feature, force-hide) ----------

export function listAllProducts(q: string) {
  const term = q.trim();
  return db.product.findMany({
    where: term
      ? { OR: [{ code: { equals: term.toUpperCase() } }, { titleEn: { contains: term, mode: "insensitive" } }, { titleHi: { contains: term } }, { design: { shop: { shopName: { contains: term, mode: "insensitive" } } } }] }
      : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { design: { select: { shop: { select: { shopName: true, slug: true } } } }, _count: { select: { reports: { where: { status: "open" } } } } },
  });
}

export async function setProductFlag(productId: string, flag: "isFeatured" | "hiddenByAdmin", value: boolean, actorId: string) {
  await db.$transaction(async (tx) => {
    await tx.product.update({ where: { id: productId }, data: { [flag]: value } });
    await audit(tx, { actorId, action: `product.${flag}.${value}`, entity: "Product", entityId: productId });
  });
}

// ---------- Reports queue (SPEC §9, §10) ----------

export function listReports(status: ReportStatus) {
  return db.report.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { product: { select: { id: true, code: true, titleEn: true, titleHi: true, hiddenByAdmin: true, design: { select: { shop: { select: { shopName: true } } } } } } },
  });
}

export async function closeReport(reportId: string, status: "resolved" | "dismissed", hideProduct: boolean, actorId: string) {
  await db.$transaction(async (tx) => {
    const r = await tx.report.update({ where: { id: reportId }, data: { status } });
    if (hideProduct) await tx.product.update({ where: { id: r.productId }, data: { hiddenByAdmin: true } });
    await audit(tx, { actorId, action: `report.${status}${hideProduct ? ".hide" : ""}`, entity: "Report", entityId: reportId, after: { productId: r.productId } });
  });
}

// ---------- Option lists (SPEC §9) ----------

export const OPTION_LISTS = ["category", "occasion", "colour", "size", "ageRange", "forWhom", "setPiece", "city", "area"] as const;
export type OptionList = (typeof OPTION_LISTS)[number];
export type OptionRow = { id: string; slug: string; nameEn: string; nameHi: string; sortOrder: number; isActive: boolean; hex?: string; cityId?: string };
export type OptionInput = { nameEn: string; nameHi: string; sortOrder: number; isActive: boolean; hex?: string };

type Delegate = {
  findMany(args: object): Promise<OptionRow[]>;
  create(args: { data: object }): Promise<{ id: string }>;
  update(args: { where: { id: string }; data: object }): Promise<{ id: string }>;
  findFirst(args: object): Promise<{ id: string } | null>;
};
// every option model shares slug/nameEn/nameHi/sortOrder/isActive; colour adds hex, area adds cityId
const model = (list: OptionList) => db[list] as unknown as Delegate;

export async function listOptions(list: OptionList, cityId?: string) {
  return model(list).findMany({ where: list === "area" ? { cityId } : {}, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] });
}

export async function saveOption(list: OptionList, id: string | null, input: OptionInput, actorId: string, cityId?: string) {
  const data = { nameEn: input.nameEn, nameHi: input.nameHi, sortOrder: input.sortOrder, isActive: input.isActive, ...(list === "colour" ? { hex: input.hex } : {}) };
  let entityId = id;
  if (id) await model(list).update({ where: { id }, data });
  else {
    const base = slugBase(input.nameEn);
    let slug = base;
    for (let i = 2; await model(list).findFirst({ where: { slug, ...(list === "area" ? { cityId } : {}) } }); i++) slug = `${base}-${i}`;
    entityId = (await model(list).create({ data: { ...data, slug, ...(list === "area" ? { cityId } : {}) } })).id;
  }
  await audit(db, { actorId, action: id ? "option.update" : "option.create", entity: list, entityId: entityId!, after: data });
}

export const listSynonyms = () => db.searchSynonym.findMany({ orderBy: [{ target: "asc" }, { term: "asc" }] });

export async function addSynonym(term: string, target: string, actorId: string) {
  const row = await db.searchSynonym.upsert({ where: { term }, create: { term, target }, update: { target } });
  await audit(db, { actorId, action: "synonym.save", entity: "SearchSynonym", entityId: row.id, after: { term, target } });
}

export async function deleteSynonym(id: string, actorId: string) {
  const row = await db.searchSynonym.delete({ where: { id } });
  await audit(db, { actorId, action: "synonym.delete", entity: "SearchSynonym", entityId: id, before: row });
}

// ---------- Stats (SPEC §9) ----------

export async function getStats(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [shops, liveShops, products, visible, views, clicks, topProducts, topShopRows] = await Promise.all([
    db.shop.count({ where: { deletedAt: null } }),
    db.shop.count({ where: { deletedAt: null, status: "approved" } }),
    db.product.count({ where: { design: { shop: { deletedAt: null } } } }),
    db.product.count({ where: { isHidden: false, hiddenByAdmin: false, design: { shop: { deletedAt: null, status: "approved" } } } }),
    db.$queryRaw<{ day: string; n: number }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS day, count(*)::int AS n
      FROM "ProductView" WHERE "createdAt" >= ${since} GROUP BY 1`,
    db.$queryRaw<{ day: string; n: number }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS day, count(*)::int AS n
      FROM "EnquiryClick" WHERE "createdAt" >= ${since} GROUP BY 1`,
    db.product.findMany({
      orderBy: [{ enquiryCount: "desc" }, { viewCount: "desc" }],
      take: 10,
      select: { code: true, titleEn: true, viewCount: true, enquiryCount: true, design: { select: { shop: { select: { shopName: true } } } } },
    }),
    db.$queryRaw<{ shopName: string; slug: string; views: number; enquiries: number }[]>`
      SELECT s."shopName", s.slug, sum(p."viewCount")::int AS views, sum(p."enquiryCount")::int AS enquiries
      FROM "Shop" s JOIN "Design" d ON d."shopId" = s.id JOIN "Product" p ON p."designId" = d.id
      WHERE s."deletedAt" IS NULL GROUP BY s.id ORDER BY enquiries DESC, views DESC LIMIT 10`,
  ]);
  const byDay = Array.from({ length: days }, (_, i) => {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() - i * 86_400_000));
    return { day, views: views.find((v) => v.day === day)?.n ?? 0, clicks: clicks.find((c) => c.day === day)?.n ?? 0 };
  });
  return { shops, liveShops, products, visible, byDay, topProducts, topShops: topShopRows };
}

// ---------- Audit log ----------

export function listAudit(entity?: string) {
  return db.auditLog.findMany({ where: entity ? { entity } : {}, orderBy: { createdAt: "desc" }, take: 200 });
}
