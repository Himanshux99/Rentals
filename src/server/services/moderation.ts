import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Moderation, RejectReason } from "@/lib/moderation";
import { db } from "../db";
import { imageSrc } from "../storage";
import { audit } from "./audit";

// ---------- Direct Upload Mode ----------

/**
 * Reads Direct Upload Mode inside the caller's transaction. FOR SHARE makes a concurrent toggle wait until
 * this upload or edit commits, so each one follows exactly one policy. A missing row means review is on.
 */
export async function readDirectUpload(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<{ directUpload: boolean }[]>`SELECT "directUpload" FROM "SiteSetting" WHERE id = 1 FOR SHARE`;
  return rows[0]?.directUpload ?? false;
}

export const getDirectUpload = async () => (await db.siteSetting.findUnique({ where: { id: 1 } }))?.directUpload ?? false;

/** Affects future uploads only: existing products keep their status. */
export async function setDirectUpload(value: boolean, actorId: string) {
  await db.$transaction(async (tx) => {
    const before = await tx.siteSetting.findUnique({ where: { id: 1 } });
    await tx.siteSetting.upsert({ where: { id: 1 }, create: { id: 1, directUpload: value }, update: { directUpload: value } });
    await audit(tx, { actorId, action: `setting.directUpload.${value}`, entity: "SiteSetting", entityId: "1", before: { directUpload: before?.directUpload ?? false }, after: { directUpload: value } });
  });
}

// ---------- Review queue ----------

export const QUEUE_PAGE = 20;
export type QueueFilter = { status: Moderation; sort: "oldest" | "newest"; category: string | null; q: string };
export type QueueCursor = { at: string; id: string };

const named = { select: { nameEn: true, nameHi: true } } as const;
const item = {
  id: true,
  code: true,
  titleEn: true,
  titleHi: true,
  moderation: true,
  submittedAt: true,
  createdAt: true,
  isHidden: true,
  hiddenByAdmin: true,
  rejectReason: true,
  rejectNote: true,
  images: { orderBy: { sortOrder: "asc" }, select: { key: true } },
  colours: { orderBy: { sortOrder: "asc" }, select: { nameEn: true, nameHi: true, hex: true } },
  sizes: { orderBy: { size: { sortOrder: "asc" } }, select: { stockCount: true, size: named } },
  _count: { select: { reports: { where: { status: "open" } } } },
  design: {
    select: {
      description: true,
      rentPerDay: true,
      rentPerWeek: true,
      sellPrice: true,
      securityDeposit: true,
      category: named,
      forWhom: named,
      ageRanges: named,
      occasions: named,
      setPieces: named,
      fabrics: named,
      works: named,
      shop: { select: { shopName: true, slug: true, ownerName: true, whatsappPhone: true, isVerified: true, status: true, area: named } },
    },
  },
} satisfies Prisma.ProductSelect;

type Row = Prisma.ProductGetPayload<{ select: typeof item }>;
export type QueueItem = Omit<Row, "images" | "submittedAt"> & { images: string[]; version: string };

const baseWhere = (f: Pick<QueueFilter, "status" | "category" | "q">): Prisma.ProductWhereInput => {
  const q = f.q.trim();
  return {
    moderation: f.status,
    design: { shop: { deletedAt: null }, ...(f.category ? { category: { slug: f.category } } : {}) },
    ...(q ? { OR: [{ code: q.toUpperCase() }, { design: { shop: { shopName: { contains: q, mode: "insensitive" } } } }] } : {}),
  };
};

export const countPending = () => db.product.count({ where: baseWhere({ status: "pending", category: null, q: "" }) });

/** One page of the queue, keyset-paged on (submittedAt, id) so items removed meanwhile don't shift the next page. */
export async function listQueue(f: QueueFilter, cursor: QueueCursor | null) {
  const asc = f.sort === "oldest";
  const op = asc ? "gt" : "lt";
  const at = cursor && new Date(cursor.at);
  const rows = await db.product.findMany({
    where: at ? { AND: [baseWhere(f), { OR: [{ submittedAt: { [op]: at } }, { submittedAt: at, id: { [op]: cursor.id } }] }] } : baseWhere(f),
    orderBy: [{ submittedAt: asc ? "asc" : "desc" }, { id: asc ? "asc" : "desc" }],
    take: QUEUE_PAGE + 1,
    select: item,
  });
  const page = rows.slice(0, QUEUE_PAGE);
  const last = page.at(-1);
  return {
    items: page.map(({ images, submittedAt, ...r }): QueueItem => ({ ...r, images: images.map((i) => imageSrc(i.key)), version: submittedAt.toISOString() })),
    next: rows.length > QUEUE_PAGE && last ? { at: last.submittedAt.toISOString(), id: last.id } : null,
  };
}

// ---------- Decisions ----------

export type Decision = { action: "approve" } | { action: "reject"; reason: RejectReason; note: string | null };
export type DecideResult = "ok" | "stale" | "gone";

/**
 * Approve or reject, only if the product is still in the status (`from`) and version (`version` = submittedAt)
 * the admin reviewed. A second admin's click, or a seller edit since, makes it "stale" instead of overwriting.
 */
export async function decide(productId: string, from: Moderation, version: string, d: Decision, actorId: string): Promise<DecideResult> {
  const to: Moderation = d.action === "approve" ? "approved" : "rejected";
  if (from === to) return "stale";
  return db.$transaction(async (tx) => {
    const data = d.action === "approve" ? { moderation: to, rejectReason: null, rejectNote: null } : { moderation: to, rejectReason: d.reason, rejectNote: d.note };
    const { count } = await tx.product.updateMany({ where: { id: productId, moderation: from, submittedAt: new Date(version) }, data });
    if (!count) return (await tx.product.count({ where: { id: productId } })) ? "stale" : "gone";
    await audit(tx, { actorId, action: `product.${d.action}`, entity: "Product", entityId: productId, before: { moderation: from, version }, after: data });
    return "ok";
  });
}
