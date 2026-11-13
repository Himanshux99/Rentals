type Named = { nameEn: string; nameHi: string };

/** "Green Lehenga – Women" / "हरा लहंगा – महिला" (SPEC §3). */
export function productTitle(category: Named, colour: Named, forWhom: Named) {
  return {
    titleEn: `${colour.nameEn} ${category.nameEn} – ${forWhom.nameEn}`,
    titleHi: `${colour.nameHi} ${category.nameHi} – ${forWhom.nameHi}`,
  };
}

export const productCode = (n: number) => `R${n}`;
