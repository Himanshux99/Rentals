"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ShopStatus } from "@/generated/prisma/client";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db";
import { IMPERSONATE_COOKIE } from "@/server/seller";
import { audit } from "@/server/services/audit";
import { addSynonym, closeReport, deleteSynonym, OPTION_LISTS, saveOption, setProductFlag, type OptionList } from "@/server/services/admin";
import { createShop, setShopStatus, setShopVerified, softDeleteShop } from "@/server/services/shops";
import { decide, listQueue, setDirectUpload, type DecideResult, type Decision, type QueueCursor, type QueueFilter } from "@/server/services/moderation";
import { REJECT_REASONS, type Moderation } from "@/lib/moderation";
import { parseShopForm, type OnboardingState } from "../seller/onboarding/shop-form";

// Every admin action re-checks the role: server actions are public endpoints.

export async function changeShopStatus(shopId: string, status: ShopStatus) {
  const admin = await requireRole("admin");
  await setShopStatus(shopId, status, admin.id);
  revalidatePath("/admin");
}

export async function toggleVerified(shopId: string, value: boolean) {
  const admin = await requireRole("admin");
  await setShopVerified(shopId, value, admin.id);
  revalidatePath("/admin");
}

export async function deleteShopAction(shopId: string) {
  const admin = await requireRole("admin");
  await softDeleteShop(shopId, admin.id);
  revalidatePath("/admin");
}

/** Login as seller (SPEC §9). */
export async function startImpersonating(shopId: string) {
  const admin = await requireRole("admin");
  const shop = await db.shop.findFirst({ where: { id: shopId, deletedAt: null }, select: { id: true } });
  if (!shop) return;
  (await cookies()).set(IMPERSONATE_COOKIE, shop.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 4 * 3600 });
  await audit(db, { actorId: admin.id, action: "admin.impersonate", entity: "Shop", entityId: shop.id });
  redirect("/seller");
}

export async function stopImpersonating() {
  await requireRole("admin");
  (await cookies()).delete(IMPERSONATE_COOKIE);
  redirect("/admin");
}

/** Create a shop on a seller's behalf, without OTP. It is live at once; the seller claims it by verifying this number. */
export async function adminCreateShopAction(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const admin = await requireRole("admin");
  const p = await parseShopForm(formData, null, []);
  if (!p.ok) return p.state;
  if (await db.shop.findUnique({ where: { loginPhone: p.input.whatsappPhone } })) return { errors: { whatsapp: "phoneTaken" }, values: p.values };
  try {
    await createShop(null, p.input.whatsappPhone, p.input, admin.id);
  } catch (e) {
    console.error(e);
    return { errors: { form: "failed" }, values: p.values };
  }
  redirect("/admin?status=approved");
}

export async function productFlag(productId: string, flag: "isFeatured" | "hiddenByAdmin", value: boolean) {
  const admin = await requireRole("admin");
  await setProductFlag(productId, flag, value, admin.id);
  revalidatePath("/admin/products");
  revalidatePath("/admin/reports");
}

export async function closeReportAction(reportId: string, status: "resolved" | "dismissed", hide: boolean) {
  const admin = await requireRole("admin");
  await closeReport(reportId, status, hide, admin.id);
  revalidatePath("/admin/reports");
}

// ---------- Product review ----------

const status = z.enum(["pending", "approved", "rejected"]);
const filter = z.object({ status, sort: z.enum(["oldest", "newest"]), category: z.string().max(60).nullable(), q: z.string().max(60) });
const cursor = z.object({ at: z.iso.datetime(), id: z.string().max(40) });
const decision = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.enum(REJECT_REASONS), note: z.string().trim().max(300).transform((s) => s || null) }),
]);

export async function loadQueueAction(f: QueueFilter, c: QueueCursor) {
  await requireRole("admin");
  return listQueue(filter.parse(f), cursor.parse(c));
}

export async function moderateAction(productId: string, from: Moderation, version: string, d: Decision): Promise<DecideResult> {
  const admin = await requireRole("admin");
  return decide(z.string().max(40).parse(productId), status.parse(from), z.iso.datetime().parse(version), decision.parse(d), admin.id);
}

export async function setDirectUploadAction(value: boolean) {
  const admin = await requireRole("admin");
  await setDirectUpload(z.boolean().parse(value), admin.id);
  revalidatePath("/admin/review");
}

const option = z.object({
  nameEn: z.string().trim().min(1).max(60),
  nameHi: z.string().trim().min(1).max(60),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isActive: z.literal("on").optional(),
  hex: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
});

export async function saveOptionAction(list: string, id: string | null, cityId: string | null, formData: FormData) {
  const admin = await requireRole("admin");
  if (!OPTION_LISTS.includes(list as OptionList)) return;
  const d = option.safeParse(Object.fromEntries([...formData].filter(([, v]) => v !== "")));
  if (!d.success) return;
  if (list === "colour" && !d.data.hex) return;
  await saveOption(list as OptionList, id, { ...d.data, isActive: d.data.isActive === "on" }, admin.id, cityId ?? undefined);
  revalidatePath(`/admin/options/${list}`);
}

export async function addSynonymAction(formData: FormData) {
  const admin = await requireRole("admin");
  const term = String(formData.get("term") ?? "").trim().toLowerCase().slice(0, 60);
  const target = String(formData.get("target") ?? "").trim().toLowerCase().slice(0, 60);
  if (term && target) await addSynonym(term, target, admin.id);
  revalidatePath("/admin/options/synonym");
}

export async function deleteSynonymAction(id: string) {
  const admin = await requireRole("admin");
  await deleteSynonym(id, admin.id);
  revalidatePath("/admin/options/synonym");
}
