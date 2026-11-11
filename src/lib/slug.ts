// Latin letters and digits only; Hindi-only names fall back to "shop" (a suffix keeps slugs unique).
export function slugBase(name: string) {
  return name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "shop";
}

export const INDIAN_MOBILE = /^\+91[6-9]\d{9}$/;
