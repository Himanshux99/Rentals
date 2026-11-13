import "server-only";
import { productCode, productTitle } from "@/lib/product";
import { isOwnKey, productPrefix } from "@/lib/upload-key";
import { db } from "../db";
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

/** The seller's products, newest first, with the cover image key. */
export function listShopProducts(shopId: string) {
  return db.product.findMany({
    where: { design: { shopId } },
    orderBy: { createdAt: "desc" },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, sizes: { include: { size: true }, orderBy: { size: { sortOrder: "asc" } } } },
  });
}
