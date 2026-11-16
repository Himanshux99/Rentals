type Named = { nameEn: string; nameHi: string };

/** "Green Lehenga – Women", "Red & Gold Lehenga – Women", 3+ colours "Multicolour Lehenga – Women" (SPEC §3). */
export function productTitle(category: Named, colours: Named[], forWhom: Named) {
  const shade = (k: keyof Named, and: string, multi: string) => (colours.length > 2 ? multi : colours.map((c) => c[k]).join(and));
  return {
    titleEn: `${shade("nameEn", " & ", "Multicolour")} ${category.nameEn} – ${forWhom.nameEn}`,
    titleHi: `${shade("nameHi", " और ", "मल्टीकलर")} ${category.nameHi} – ${forWhom.nameHi}`,
  };
}

export const productCode = (n: number) => `R${n}`;
