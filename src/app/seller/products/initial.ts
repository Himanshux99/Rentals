import "server-only";
import type { getProductForEdit } from "@/server/services/products";
import { imageSrc } from "@/server/storage";
import type { ProductInitial } from "./new/product-form";

type Loaded = NonNullable<Awaited<ReturnType<typeof getProductForEdit>>>;
const str = (n: number | null) => (n == null ? "" : String(n));

/** Form prefill from a saved product. `withColour` keeps its colour, photos and sizes (Edit); Duplicate drops them. */
export function toInitial(p: Loaded, withColour: boolean): ProductInitial {
  const d = p.design;
  return {
    categoryId: d.categoryId,
    forWhomId: d.forWhom[0]?.id ?? "",
    ageRangeIds: d.ageRanges.map((x) => x.id),
    occasionIds: d.occasions.map((x) => x.id),
    setPieceIds: d.setPieces.map((x) => x.id),
    prices: { rentPerDay: str(d.rentPerDay), rentPerWeek: str(d.rentPerWeek), sellPrice: str(d.sellPrice), securityDeposit: str(d.securityDeposit) },
    description: d.description ?? "",
    colourIds: withColour ? [p.colourId] : [],
    perColour: withColour
      ? {
          [p.colourId]: {
            images: p.images.map((i) => ({ id: i.id, preview: imageSrc(i.key), key: i.key, ogKey: i.ogKey, progress: 100 })),
            sizes: Object.fromEntries(p.sizes.map((s) => [s.sizeId, Math.max(1, s.stockCount)])),
          },
        }
      : {},
  };
}
