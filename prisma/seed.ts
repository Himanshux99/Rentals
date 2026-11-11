// Starting option lists in both languages. Safe to re-run: every row is upserted by slug.
// Barwani areas are placeholders: confirm the real neighbourhood list before launch.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

type Opt = [slug: string, en: string, hi: string];

const categories: Opt[] = [
  ["lehenga", "Lehenga", "लहंगा"], ["saree", "Saree", "साड़ी"], ["gown", "Gown", "गाउन"],
  ["sherwani", "Sherwani", "शेरवानी"], ["kurta-set", "Kurta Set", "कुर्ता सेट"], ["indo-western", "Indo-Western", "इंडो-वेस्टर्न"],
];
const occasions: Opt[] = [
  ["haldi", "Haldi", "हल्दी"], ["mehendi", "Mehendi", "मेहंदी"], ["wedding", "Wedding", "शादी"],
  ["sangeet", "Sangeet", "संगीत"], ["party", "Party", "पार्टी"], ["festival", "Festival", "त्योहार"],
];
const colours: [...Opt, string][] = [
  ["red", "Red", "लाल", "#c0262d"], ["maroon", "Maroon", "मैरून", "#6d1a24"], ["pink", "Pink", "गुलाबी", "#e07a9b"],
  ["orange", "Orange", "नारंगी", "#e57c23"], ["yellow", "Yellow", "पीला", "#e8c547"], ["green", "Green", "हरा", "#2f7d3b"],
  ["blue", "Blue", "नीला", "#2a5aa8"], ["purple", "Purple", "बैंगनी", "#6b3fa0"], ["gold", "Gold", "सुनहरा", "#c9a227"],
  ["silver", "Silver", "चाँदी", "#b8b8b8"], ["white", "White", "सफ़ेद", "#f4f4f4"], ["black", "Black", "काला", "#1a1a1a"],
  ["peach", "Peach", "पीच", "#f4b183"], ["cream", "Cream", "क्रीम", "#efe3c8"],
];
const sizes: Opt[] = [
  ["xs", "XS", "XS"], ["s", "S", "S"], ["m", "M", "M"], ["l", "L", "L"], ["xl", "XL", "XL"], ["xxl", "XXL", "XXL"],
  ["free", "Free size", "फ्री साइज़"],
];
const ageRanges: Opt[] = [
  ["0-5", "0–5 years", "0–5 साल"], ["6-12", "6–12 years", "6–12 साल"], ["13-17", "13–17 years", "13–17 साल"], ["adult", "Adult", "बड़े"],
];
const forWhom: Opt[] = [["women", "Women", "महिला"], ["men", "Men", "पुरुष"], ["girls", "Girls", "लड़कियाँ"], ["boys", "Boys", "लड़के"]];
const setPieces: Opt[] = [
  ["blouse", "Blouse", "ब्लाउज़"], ["skirt", "Skirt", "घाघरा"], ["dupatta", "Dupatta", "दुपट्टा"], ["kurta", "Kurta", "कुर्ता"],
  ["pyjama", "Pyjama", "पायजामा"], ["jacket", "Jacket", "जैकेट"], ["safa", "Safa", "साफ़ा"], ["stole", "Stole", "स्टोल"],
];
const synonyms: [string, string][] = [
  ["lehnga", "lehenga"], ["lahenga", "lehenga"], ["लहंगा", "lehenga"], ["लहँगा", "lehenga"], ["sari", "saree"], ["साड़ी", "saree"],
  ["sherwaani", "sherwani"], ["शेरवानी", "sherwani"], ["gaun", "gown"], ["गाउन", "gown"],
];
const barwaniAreas: Opt[] = [
  ["main-bazaar", "Main Bazaar", "मेन बाज़ार"], ["bus-stand", "Bus Stand", "बस स्टैंड"],
  ["collectorate-road", "Collectorate Road", "कलेक्टोरेट रोड"], ["other", "Other", "अन्य"],
];

async function main() {
  const row = ([slug, nameEn, nameHi]: Opt, i: number) => ({ slug, nameEn, nameHi, sortOrder: i });
  const up = async (model: any, list: Opt[]) => {
    for (const [i, o] of list.entries()) await model.upsert({ where: { slug: o[0] }, create: row(o, i), update: row(o, i) });
  };
  await up(db.category, categories);
  await up(db.occasion, occasions);
  await up(db.size, sizes);
  await up(db.ageRange, ageRanges);
  await up(db.forWhom, forWhom);
  await up(db.setPiece, setPieces);
  for (const [i, [slug, nameEn, nameHi, hex]] of colours.entries()) {
    const data = { slug, nameEn, nameHi, hex, sortOrder: i };
    await db.colour.upsert({ where: { slug }, create: data, update: data });
  }
  for (const [term, target] of synonyms) await db.searchSynonym.upsert({ where: { term }, create: { term, target }, update: { target } });

  const city = await db.city.upsert({
    where: { slug: "barwani" },
    create: { slug: "barwani", nameEn: "Barwani", nameHi: "बड़वानी" },
    update: { nameEn: "Barwani", nameHi: "बड़वानी" },
  });
  for (const [i, o] of barwaniAreas.entries()) {
    await db.area.upsert({ where: { cityId_slug: { cityId: city.id, slug: o[0] } }, create: { ...row(o, i), cityId: city.id }, update: row(o, i) });
  }
  console.log("Seeded option lists and Barwani.");
}

main().finally(() => db.$disconnect());
