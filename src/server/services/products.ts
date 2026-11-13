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
  rentPerDay: number | null;
  rentPerWeek: number | null;
  sellPrice: number | null;
  securityDeposit: number | null;
  description: string | null;
  colours: { colourId: string; images: { key: string; ogKey: string }[]; sizes: { sizeId: string; stock: number }[] }[];
};

const active = { where: { isActive: true }, orderBy: { sortOrder: "asc" as const } };

/** Every option list the upload form shows. */
export async function listProductOptions() {
  const [categories, forWhom, ageRanges, occasions, setPieces, colours, sizes] = await Promise.all([
    db.category.findMany(active),
    db.forWhom.findMany(active),
    db.ageRange.findMany(active),
    db.occasion.findMany(active),
    db.setPiece.findMany(active),
    db.colour.findMany(active),
    db.size.findMany(active),
  ]);
  return { categories, forWhom, ageRanges, occasions, setPieces, colours, sizes };
}

/** One Design with one live Product per colour (SPEC §5). Returns the new product codes. */
export async function createDesign(shopId: string, actorId: string, input: NewDesign) {
  if (input.rentPerDay == null && input.rentPerWeek == null && input.sellPrice == null) throw new Error("no price");
  const prefix = productPrefix(shopId);
  for (const c of input.colours)
    for (const img of c.images)
      if (!isOwnKey(img.key, prefix) || !isOwnKey(img.ogKey, prefix)) throw new Error("image key not owned by shop");

  const [category, forWhom, colours] = await Promise.all([
    db.category.findUniqueOrThrow({ where: { id: input.categoryId } }),
    db.forWhom.findUniqueOrThrow({ where: { id: input.forWhomId } }),
    db.colour.findMany({ where: { id: { in: input.colours.map((c) => c.colourId) } } }),
  ]);
  const ids = (list: string[]) => ({ connect: list.map((id) => ({ id })) });

  return db.$transaction(
    async (tx) => {
      const design = await tx.design.create({
        data: {
          shopId,
          categoryId: category.id,
          forWhom: ids([forWhom.id]),
          ageRanges: ids(input.ageRangeIds),
          occasions: ids(input.occasionIds),
          setPieces: ids(input.setPieceIds),
          rentPerDay: input.rentPerDay,
          rentPerWeek: input.rentPerWeek,
          sellPrice: input.sellPrice,
          securityDeposit: input.securityDeposit,
          description: input.description,
        },
      });
      const codes: string[] = [];
      for (const c of input.colours) {
        const colour = colours.find((x) => x.id === c.colourId);
        if (!colour) throw new Error("unknown colour");
        const [{ n }] = await tx.$queryRaw<{ n: number }[]>`SELECT nextval('product_code_seq')::int AS n`;
        const product = await tx.product.create({
          data: {
            designId: design.id,
            code: productCode(n),
            colourId: colour.id,
            ...productTitle(category, colour, forWhom),
            sizes: { create: c.sizes.map((s) => ({ sizeId: s.sizeId, stockCount: s.stock, availableCount: s.stock })) },
            images: { create: c.images.map((img, i) => ({ key: img.key, ogKey: img.ogKey, sortOrder: i })) },
          },
        });
        codes.push(product.code);
      }
      await audit(tx, { actorId, action: "design.create", entity: "Design", entityId: design.id, after: { ...input, codes } });
      return codes;
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

/** Deletes the product and its photos; the design goes too when it has no colours left. */
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

/** For Edit and Duplicate: the design's shared fields plus one product's photos and sizes. */
export function getProductForEdit(shopId: string, productId: string) {
  return db.product.findFirst({
    where: { id: productId, design: { shopId } },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      sizes: true,
      design: { include: { forWhom: true, ageRanges: true, occasions: true, setPieces: true } },
    },
  });
}

/**
 * Edit: updates the shared design (titles of every colour follow category / for-whom) and this
 * product's photos and sizes. Stock changes keep how many pieces are out on rent.
 */
export async function updateProduct(shopId: string, actorId: string, productId: string, input: NewDesign) {
  const p = await ownedProduct(shopId, productId);
  const c = input.colours[0];
  if (!c || input.colours.length !== 1 || c.colourId !== p.colourId) throw new Error("edit keeps the product's colour");
  if (input.rentPerDay == null && input.rentPerWeek == null && input.sellPrice == null) throw new Error("no price");
  const prefix = productPrefix(shopId);
  for (const img of c.images) if (!isOwnKey(img.key, prefix) || !isOwnKey(img.ogKey, prefix)) throw new Error("image key not owned by shop");

  const [category, forWhom] = await Promise.all([
    db.category.findUniqueOrThrow({ where: { id: input.categoryId } }),
    db.forWhom.findUniqueOrThrow({ where: { id: input.forWhomId } }),
  ]);
  const set = (list: string[]) => ({ set: list.map((id) => ({ id })) });
  const removed = p.images.filter((i) => !c.images.some((n) => n.key === i.key));

  await db.$transaction(
    async (tx) => {
      const before = await tx.design.findUniqueOrThrow({ where: { id: p.designId }, include: { products: { include: { colour: true, sizes: true } } } });
      await tx.design.update({
        where: { id: p.designId },
        data: {
          categoryId: category.id,
          forWhom: set([forWhom.id]),
          ageRanges: set(input.ageRangeIds),
          occasions: set(input.occasionIds),
          setPieces: set(input.setPieceIds),
          rentPerDay: input.rentPerDay,
          rentPerWeek: input.rentPerWeek,
          sellPrice: input.sellPrice,
          securityDeposit: input.securityDeposit,
          description: input.description,
        },
      });
      for (const sib of before.products) await tx.product.update({ where: { id: sib.id }, data: productTitle(category, sib.colour, forWhom) });

      const old = before.products.find((x) => x.id === p.id)!.sizes;
      await tx.productSize.deleteMany({ where: { productId: p.id, sizeId: { notIn: c.sizes.map((s) => s.sizeId) } } });
      for (const s of c.sizes) {
        const prev = old.find((o) => o.sizeId === s.sizeId);
        const out = prev ? prev.stockCount - prev.availableCount : 0;
        await tx.productSize.upsert({
          where: { productId_sizeId: { productId: p.id, sizeId: s.sizeId } },
          create: { productId: p.id, sizeId: s.sizeId, stockCount: s.stock, availableCount: s.stock },
          update: { stockCount: s.stock, availableCount: Math.max(0, s.stock - out) },
        });
      }
      await tx.productImage.deleteMany({ where: { productId: p.id } });
      await tx.productImage.createMany({ data: c.images.map((img, i) => ({ productId: p.id, key: img.key, ogKey: img.ogKey, sortOrder: i })) });
      await tx.product.update({ where: { id: p.id }, data: { lastSellerTouchAt: new Date() } });
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
