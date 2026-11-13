import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole, type CurrentUser } from "./auth";
import { db } from "./db";
import { getShopForUser } from "./services/shops";

// "Login as seller" (SPEC §9): an admin acts on a shop's dashboard. The shop id sits in an httpOnly
// cookie that is only honoured for role=admin, and every change is audited under the admin's own id.
export const IMPERSONATE_COOKIE = "impersonate";

export type SellerContext = { user: CurrentUser; shop: NonNullable<Awaited<ReturnType<typeof getShopForUser>>>; impersonating: boolean };

/** The shop the signed-in user acts for, or null when they have none yet. */
export async function getSellerContext(): Promise<Omit<SellerContext, "shop"> & { shop: SellerContext["shop"] | null }> {
  const user = await requireRole("seller");
  if (user.role === "admin") {
    const id = (await cookies()).get(IMPERSONATE_COOKIE)?.value;
    const shop = id ? await db.shop.findFirst({ where: { id, deletedAt: null } }) : null;
    // admins have no shop of their own (and no verified phone to onboard with)
    if (!shop) redirect("/admin");
    return { user, shop, impersonating: true };
  }
  return { user, shop: await getShopForUser(user.id, user.phoneNumber), impersonating: false };
}

/** Like getSellerContext, but the shop must exist and be live. */
export async function requireLiveShop(): Promise<SellerContext> {
  const ctx = await getSellerContext();
  if (ctx.shop?.status !== "approved") redirect("/seller");
  return ctx as SellerContext;
}
