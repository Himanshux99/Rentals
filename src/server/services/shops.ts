import "server-only";
import type { ShopStatus } from "@/generated/prisma/client";
import { db } from "../db";
import { storage } from "../storage";
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

/** A seller's own shop (pending), or with `userId` null an admin-created live shop the seller claims later. */
export async function createShop(userId: string | null, loginPhone: string, input: NewShop, actorId = userId!) {
  const area = await db.area.findFirst({ where: { id: input.areaId, cityId: input.cityId, isActive: true } });
  if (!area) throw new Error("Area does not belong to the city");
  const slug = await uniqueSlug(input.shopName);
  return db.$transaction(async (tx) => {
    const shop = await tx.shop.create({
      data: { ...input, slug, ownerUserId: userId, loginPhone, status: userId ? "pending" : "approved" },
    });
    await audit(tx, { actorId, action: userId ? "shop.create" : "shop.createOnBehalf", entity: "Shop", entityId: shop.id, after: shop });
    return shop;
  });
}

export function listShops(status?: ShopStatus, q = "") {
  const term = q.trim();
  return db.shop.findMany({
    where: {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(term
        ? { OR: [{ shopName: { contains: term, mode: "insensitive" } }, { ownerName: { contains: term, mode: "insensitive" } }, { whatsappPhone: { contains: term } }, { loginPhone: { contains: term } }] }
        : {}),
    },
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

export async function setShopVerified(shopId: string, isVerified: boolean, actorId: string) {
  return db.$transaction(async (tx) => {
    await tx.shop.update({ where: { id: shopId }, data: { isVerified } });
    await audit(tx, { actorId, action: isVerified ? "shop.verify" : "shop.unverify", entity: "Shop", entityId: shopId });
  });
}

/** Settings: edit profile and WhatsApp number. A replaced shop photo is deleted from storage. */
export async function updateShop(shopId: string, actorId: string, input: NewShop) {
  const area = await db.area.findFirst({ where: { id: input.areaId, cityId: input.cityId, isActive: true } });
  if (!area) throw new Error("Area does not belong to the city");
  const before = await db.shop.findUniqueOrThrow({ where: { id: shopId } });
  await db.$transaction(async (tx) => {
    const after = await tx.shop.update({ where: { id: shopId }, data: input });
    await audit(tx, { actorId, action: "shop.update", entity: "Shop", entityId: shopId, before, after });
  });
  if (before.shopPhotoKey && before.shopPhotoKey !== input.shopPhotoKey) await storage.delete(before.shopPhotoKey).catch(() => {});
}

/**
 * Delete account (SPEC §4): soft-deletes the shop and hides its products. The owner link and login
 * number are released so the same seller can start again later.
 */
export async function softDeleteShop(shopId: string, actorId: string) {
  await db.$transaction(async (tx) => {
    const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId } });
    await tx.shop.update({ where: { id: shopId }, data: { deletedAt: new Date(), ownerUserId: null, loginPhone: `${shop.loginPhone}#deleted-${Date.now()}` } });
    await tx.product.updateMany({ where: { design: { shopId } }, data: { isHidden: true } });
    await audit(tx, { actorId, action: "shop.delete", entity: "Shop", entityId: shopId, before: { ownerUserId: shop.ownerUserId, loginPhone: shop.loginPhone } });
  });
}
