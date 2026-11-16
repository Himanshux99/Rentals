import "server-only";
import { productCode, productTitle } from "@/lib/product";
import { isOwnKey, productPrefix } from "@/lib/upload-key";
import { db } from "../db";
import { storage } from "../storage";
import { audit } from "./audit";

export type NewDesign = {
  categoryId: string;
  forWhomId: string;
  ageRangeIds: string[];
  occasionIds: string[];
  setPieceIds: string[];
  fabricIds: string[];
  workIds: string[];
  colourIds: string[];
  rentPerDay: number | null;
  rentPerWeek: number | null;
  sellPrice: number | null;
  securityDeposit: number | null;
  description: string | null;
  images: { key: string; ogKey: string }[];
  sizes: { sizeId: string; stock: number }[];
};

const active = { where: { isActive: true }, orderBy: { sortOrder: "asc" as const } };

/** Every option list the upload form shows. */
export async function listProductOptions() {
  const [categories, forWhom, ageRanges, occasions, setPieces, fabrics, works, colours, sizes] = await Promise.all([
    db.category.findMany(active),
    db.forWhom.findMany(active),
    db.ageRange.findMany(active),
    db.occasion.findMany(active),
    db.setPiece.findMany(active),
    db.fabric.findMany(active),
    db.work.findMany(active),
    db.colour.findMany(active),
    db.size.findMany(active),
  ]);
  return { categories, forWhom, ageRanges, occasions, setPieces, fabrics, works, colours, sizes };
}

function checkInput(shopId: string, input: NewDesign) {
  if (input.rentPerDay == null && input.rentPerWeek == null && input.sellPrice == null) throw new Error("no price");
  const prefix = productPrefix(shopId);
  for (const img of input.images) if (!isOwnKey(img.key, prefix) || !isOwnKey(img.ogKey, prefix)) throw new Error("image key not owned by shop");
}

/** Category, for-whom and colours (in list order) that make the title. Throws on unknown ids. */
async function titleParts(input: NewDesign) {
  const [category, forWhom, colours] = await Promise.all([
    db.category.findUniqueOrThrow({ where: { id: input.categoryId } }),
    db.forWhom.findUniqueOrThrow({ where: { id: input.forWhomId } }),
    db.colour.findMany({ where: { id: { in: input.colourIds } }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (colours.length !== new Set(input.colourIds).size) throw new Error("unknown colour");
  return { category, forWhom, colours };
}

/** Choice and price fields of a Design; `op` is "connect" on create, "set" on edit. */
const designData = (input: NewDesign, op: "connect" | "set") => {
  const ids = (list: string[]) => ({ [op]: list.map((id) => ({ id })) });
  return {
    categoryId: input.categoryId,
    forWhom: ids([input.forWhomId]),
    ageRanges: ids(input.ageRangeIds),
    occasions: ids(input.occasionIds),
    setPieces: ids(input.setPieceIds),
    fabrics: ids(input.fabricIds),
    works: ids(input.workIds),
    rentPerDay: input.rentPerDay,
    rentPerWeek: input.rentPerWeek,
    sellPrice: input.sellPrice,
    securityDeposit: input.securityDeposit,
    description: input.description,
  };
};

/** One Design with one live Product (any number of colours). Returns the new product code. */
export async function createDesign(shopId: string, actorId: string, input: NewDesign) {
  checkInput(shopId, input);
  const { category, forWhom, colours } = await titleParts(input);

  return db.$transaction(
    async (tx) => {
      const design = await tx.design.create({ data: { shopId, ...designData(input, "connect") } });
      const [{ n }] = await tx.$queryRaw<{ n: number }[]>`SELECT nextval('product_code_seq')::int AS n`;
      const product = await tx.product.create({
        data: {
          designId: design.id,
          code: productCode(n),
          colours: { connect: colours.map((c) => ({ id: c.id })) },
          ...productTitle(category, colours, forWhom),
          sizes: { create: input.sizes.map((s) => ({ sizeId: s.sizeId, stockCount: s.stock, availableCount: s.stock })) },
          images: { create: input.images.map((img, i) => ({ key: img.key, ogKey: img.ogKey, sortOrder: i })) },
        },
      });
      await audit(tx, { actorId, action: "design.create", entity: "Design", entityId: design.id, after: { ...input, code: product.code } });
      return product.code;
    },
    { timeout: 20_000 },
  );
}

// ---------- Seller dashboard (SPEC §6). Every mutation checks the product belongs to `shopId`. ----------

const DAY = 86_400_000;

/** The shop's products with sizes, cover and view/WhatsApp counts (last 30 days and all time). */
export async function listDashboardProducts(shopId: string) {
  const products = await db.product.findMany({
    where: { design: { shopId } },
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      sizes: { include: { size: true }, orderBy: { size: { sortOrder: "asc" } } },
      design: { select: { sellPrice: true, rentPerDay: true, rentPerWeek: true } },
    },
  });
  const ids = products.map((p) => p.id);
  const since = new Date(Date.now() - 30 * DAY);
  const [views, clicks] = await Promise.all([
    db.productView.groupBy({ by: ["productId"], where: { productId: { in: ids }, createdAt: { gte: since } }, _count: true }),
    db.enquiryClick.groupBy({ by: ["productId"], where: { productId: { in: ids }, createdAt: { gte: since } }, _count: true }),
  ]);
  const count = (rows: { productId: string; _count: number }[], id: string) => rows.find((r) => r.productId === id)?._count ?? 0;
  return products.map((p) => ({ ...p, views30: count(views, p.id), clicks30: count(clicks, p.id) }));
}

async function ownedSize(shopId: string, productSizeId: string) {
  const s = await db.productSize.findFirst({ where: { id: productSizeId, product: { design: { shopId } } } });
  if (!s) throw new Error("size not found for this shop");
  return s;
}

async function ownedProduct(shopId: string, productId: string) {
  const p = await db.product.findFirst({ where: { id: productId, design: { shopId } }, include: { images: true } });
  if (!p) throw new Error("product not found for this shop");
  return p;
}

type SizeRow = Awaited<ReturnType<typeof ownedSize>>;

/** Changes a size's row and stamps the product as seller-touched, with an audit row. */
async function updateSize(actorId: string, before: SizeRow, data: Partial<Pick<SizeRow, "availableCount" | "stockCount" | "soldCount" | "freeFromDate">>, action: string) {
  return db.$transaction(async (tx) => {
    const after = await tx.productSize.update({ where: { id: before.id }, data });
    await tx.product.update({ where: { id: before.productId }, data: { lastSellerTouchAt: new Date() } });
    await audit(tx, { actorId, action, entity: "ProductSize", entityId: before.id, before, after });
    return after;
  });
}

/** +1 / -1 on "X of N available". Back to full stock clears the free-from date. */
export async function changeAvailable(shopId: string, actorId: string, productSizeId: string, delta: 1 | -1) {
  const s = await ownedSize(shopId, productSizeId);
  const availableCount = Math.min(s.stockCount, Math.max(0, s.availableCount + delta));
  if (availableCount === s.availableCount) return s;
  return updateSize(actorId, s, { availableCount, ...(availableCount === s.stockCount ? { freeFromDate: null } : {}) }, "size.available");
}

/** "Free from [date]": the daily job resets availability on that date. `null` clears it. */
export async function setFreeFrom(shopId: string, actorId: string, productSizeId: string, date: Date | null) {
  const s = await ownedSize(shopId, productSizeId);
  return updateSize(actorId, s, { freeFromDate: date }, "size.freeFrom");
}

/** Mark Sold (for-sale items): one piece leaves stock for good. */
export async function markSold(shopId: string, actorId: string, productSizeId: string) {
  const s = await ownedSize(shopId, productSizeId);
  if (s.stockCount < 1) return s;
  const stockCount = s.stockCount - 1;
  return updateSize(actorId, s, { stockCount, availableCount: Math.max(0, Math.min(s.availableCount - 1, stockCount)), soldCount: s.soldCount + 1 }, "size.sold");
}

export async function setHidden(shopId: string, actorId: string, productId: string, isHidden: boolean) {
  await ownedProduct(shopId, productId);
  await db.$transaction(async (tx) => {
    await tx.product.update({ where: { id: productId }, data: { isHidden, lastSellerTouchAt: new Date() } });
    await audit(tx, { actorId, action: isHidden ? "product.hide" : "product.show", entity: "Product", entityId: productId });
  });
}

/** "Still available? Tap to confirm" (stale banner). */
export async function confirmFresh(shopId: string, actorId: string, productId: string) {
  await ownedProduct(shopId, productId);
  await db.$transaction(async (tx) => {
    await tx.product.update({ where: { id: productId }, data: { lastSellerTouchAt: new Date() } });
    await audit(tx, { actorId, action: "product.confirm", entity: "Product", entityId: productId });
  });
}

/** Deletes the product and its photos; the design goes too when it has no products left. */
export async function deleteProduct(shopId: string, actorId: string, productId: string) {
  const p = await ownedProduct(shopId, productId);
  await db.$transaction(async (tx) => {
    await tx.product.delete({ where: { id: p.id } });
    if (!(await tx.product.count({ where: { designId: p.designId } }))) await tx.design.delete({ where: { id: p.designId } });
    await audit(tx, { actorId, action: "product.delete", entity: "Product", entityId: p.id, before: { code: p.code, titleEn: p.titleEn } });
  });
  // files go after the rows, so a failed delete never leaves a product pointing at missing photos
  await Promise.allSettled(p.images.flatMap((i) => [storage.delete(i.key), storage.delete(i.ogKey)]));
}

/** For Edit and Duplicate: the design's fields plus the product's colours, photos and sizes. */
export function getProductForEdit(shopId: string, productId: string) {
  return db.product.findFirst({
    where: { id: productId, design: { shopId } },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      sizes: true,
      colours: true,
      design: { include: { forWhom: true, ageRanges: true, occasions: true, setPieces: true, fabrics: true, works: true } },
    },
  });
}

/**
 * Edit: updates the design and this product's colours, photos and sizes. Older designs with several
 * one-colour products keep their siblings' titles in step. Stock changes keep how many pieces are out on rent.
 */
export async function updateProduct(shopId: string, actorId: string, productId: string, input: NewDesign) {
  const p = await ownedProduct(shopId, productId);
  checkInput(shopId, input);
  const { category, forWhom, colours } = await titleParts(input);
  const removed = p.images.filter((i) => !input.images.some((n) => n.key === i.key));

  await db.$transaction(
    async (tx) => {
      const before = await tx.design.findUniqueOrThrow({
        where: { id: p.designId },
        include: { products: { include: { colours: { orderBy: { sortOrder: "asc" } }, sizes: true } } },
      });
      await tx.design.update({ where: { id: p.designId }, data: designData(input, "set") });
      for (const sib of before.products)
        if (sib.id !== p.id) await tx.product.update({ where: { id: sib.id }, data: productTitle(category, sib.colours, forWhom) });

      const old = before.products.find((x) => x.id === p.id)!.sizes;
      await tx.productSize.deleteMany({ where: { productId: p.id, sizeId: { notIn: input.sizes.map((s) => s.sizeId) } } });
      for (const s of input.sizes) {
        const prev = old.find((o) => o.sizeId === s.sizeId);
        const out = prev ? prev.stockCount - prev.availableCount : 0;
        await tx.productSize.upsert({
          where: { productId_sizeId: { productId: p.id, sizeId: s.sizeId } },
          create: { productId: p.id, sizeId: s.sizeId, stockCount: s.stock, availableCount: s.stock },
          update: { stockCount: s.stock, availableCount: Math.max(0, s.stock - out) },
        });
      }
      await tx.productImage.deleteMany({ where: { productId: p.id } });
      await tx.productImage.createMany({ data: input.images.map((img, i) => ({ productId: p.id, key: img.key, ogKey: img.ogKey, sortOrder: i })) });
      await tx.product.update({
        where: { id: p.id },
        data: { colours: { set: colours.map((c) => ({ id: c.id })) }, ...productTitle(category, colours, forWhom), lastSellerTouchAt: new Date() },
      });
      await audit(tx, { actorId, action: "product.edit", entity: "Product", entityId: p.id, before, after: input });
    },
    { timeout: 20_000 },
  );
  await Promise.allSettled(removed.flatMap((i) => [storage.delete(i.key), storage.delete(i.ogKey)]));
}

/** Daily job: sizes whose free-from date has come are fully available again. `today` is the local date (YYYY-MM-DD). */
export async function resetFreeFromDates(today: string) {
  const n = await db.$executeRaw`
    UPDATE "ProductSize" SET "availableCount" = "stockCount", "freeFromDate" = NULL
    WHERE "freeFromDate" IS NOT NULL AND "freeFromDate" <= ${today}::date`;
  if (n) await audit(db, { actorId: "system", action: "cron.freeFromReset", entity: "ProductSize", entityId: "*", after: { count: n } });
  return n;
}
