import "server-only";
import type { getProductForEdit } from "@/server/services/products";
import { imageSrc } from "@/server/storage";
import type { ProductInitial } from "./new/product-form";

type Loaded = NonNullable<Awaited<ReturnType<typeof getProductForEdit>>>;
const str = (n: number | null) => (n == null ? "" : String(n));

/** Form prefill from a saved product. `withMedia` keeps its photos and sizes (Edit); Duplicate drops them. */
export function toInitial(p: Loaded, withMedia: boolean): ProductInitial {
  const d = p.design;
  const ids = (list: { id: string }[]) => list.map((x) => x.id);
  return {
    categoryId: d.categoryId,
    forWhomId: d.forWhom[0]?.id ?? "",
    ageRangeIds: ids(d.ageRanges),
    occasionIds: ids(d.occasions),
    setPieceIds: ids(d.setPieces),
    fabricIds: ids(d.fabrics),
    workIds: ids(d.works),
    colourIds: ids(p.colours),
    prices: { rentPerDay: str(d.rentPerDay), rentPerWeek: str(d.rentPerWeek), sellPrice: str(d.sellPrice), securityDeposit: str(d.securityDeposit) },
    description: d.description ?? "",
    images: withMedia ? p.images.map((i) => ({ id: i.id, preview: imageSrc(i.key), key: i.key, ogKey: i.ogKey, progress: 100 })) : [],
    sizes: withMedia ? Object.fromEntries(p.sizes.map((s) => [s.sizeId, Math.max(1, s.stockCount)])) : {},
  };
}
