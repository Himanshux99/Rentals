// Review rules shared by the upload, edit and admin flows. Pure, so they're unit-tested.

export type Moderation = "pending" | "approved" | "rejected";

export const REJECT_REASONS = ["photos", "price", "details", "notAllowed", "duplicate", "other"] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

/** A new upload's status, decided once inside the create transaction. */
export const statusOnCreate = (directUpload: boolean): Moderation => (directUpload ? "approved" : "pending");

/**
 * Status after a seller saves an edit. A rejected product is resubmitted (never auto-approved, even with
 * Direct Upload on); an approved one goes back to review only when shopper-facing content changed and Direct Upload is off.
 */
export function statusOnEdit(current: Moderation, material: boolean, directUpload: boolean): Moderation {
  if (current === "approved") return material && !directUpload ? "pending" : "approved";
  return "pending";
}

/** What shoppers see of a product, minus availability: sizes and stock change daily and must not trigger review. */
export type PublicContent = {
  categoryId: string;
  forWhomIds: string[];
  ageRangeIds: string[];
  occasionIds: string[];
  setPieceIds: string[];
  fabricIds: string[];
  workIds: string[];
  colourIds: string[];
  imageKeys: string[];
  rentPerDay: number | null;
  rentPerWeek: number | null;
  sellPrice: number | null;
  securityDeposit: number | null;
  description: string | null;
};

const norm = (v: unknown) => (Array.isArray(v) ? [...new Set(v)].sort().join("\n") : v === "" || v === undefined ? null : v);

/** True when any shopper-facing field differs. Lists compare as sets, so reordering photos alone is not material. */
export const isMaterialEdit = (before: PublicContent, after: PublicContent) =>
  (Object.keys(before) as (keyof PublicContent)[]).some((k) => norm(before[k]) !== norm(after[k]));
