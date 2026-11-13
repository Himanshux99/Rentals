import "server-only";
import type { ShopStatus } from "@/generated/prisma/client";
import { db } from "../db";
import { slugBase } from "@/lib/slug";
import { audit } from "./audit";

export type NewShop = {
  shopName: string;
  ownerName: string;
  whatsappPhone: string;
  cityId: string;
  areaId: string;
  addressLine: string;
  mapLat: number | null;
  mapLng: number | null;
  shopPhotoKey: string | null;
};

/** The signed-in seller's shop. Also claims an admin-created shop registered to their verified number. */
export async function getShopForUser(userId: string, verifiedPhone: string | null) {
  const own = await db.shop.findFirst({ where: { ownerUserId: userId, deletedAt: null } });
  if (own || !verifiedPhone) return own;
  const unclaimed = await db.shop.findFirst({ where: { ownerUserId: null, loginPhone: verifiedPhone, deletedAt: null } });
  if (!unclaimed) return null;
  return db.$transaction(async (tx) => {
    const shop = await tx.shop.update({ where: { id: unclaimed.id }, data: { ownerUserId: userId } });
    await audit(tx, { actorId: userId, action: "shop.claim", entity: "Shop", entityId: shop.id });
    return shop;
  });
}

export async function createShop(userId: string, loginPhone: string, input: NewShop) {
  const area = await db.area.findFirst({ where: { id: input.areaId, cityId: input.cityId, isActive: true } });
  if (!area) throw new Error("Area does not belong to the city");
  const slug = await uniqueSlug(input.shopName);
  return db.$transaction(async (tx) => {
    const shop = await tx.shop.create({
      data: { ...input, slug, ownerUserId: userId, loginPhone, status: "pending" },
    });
    await audit(tx, { actorId: userId, action: "shop.create", entity: "Shop", entityId: shop.id, after: shop });
    return shop;
  });
}

export function listShops(status?: ShopStatus) {
  return db.shop.findMany({
    where: { deletedAt: null, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { area: true, city: true, owner: { select: { email: true } } },
  });
}

export async function setShopStatus(shopId: string, status: ShopStatus, actorId: string) {
  return db.$transaction(async (tx) => {
    const before = await tx.shop.findUniqueOrThrow({ where: { id: shopId } });
    const shop = await tx.shop.update({ where: { id: shopId }, data: { status } });
    await audit(tx, { actorId, action: `shop.${status}`, entity: "Shop", entityId: shopId, before: { status: before.status }, after: { status } });
    return shop;
  });
}

async function uniqueSlug(name: string) {
  const base = slugBase(name);
  if (!(await db.shop.findUnique({ where: { slug: base } }))) return base;
  for (;;) {
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (!(await db.shop.findUnique({ where: { slug } }))) return slug;
  }
}
