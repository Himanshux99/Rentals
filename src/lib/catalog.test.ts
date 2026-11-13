import assert from "node:assert/strict";
import { test } from "node:test";
import { availability, enquiryMessage, filterHref, mainPrice, parseFilters, rankScore, toggle, waLink, type Rankable } from "./catalog";

const d = (s: string) => new Date(s);

test("mainPrice prefers day, then week, then sale", () => {
  assert.deepEqual(mainPrice({ rentPerDay: null, rentPerWeek: 2000, sellPrice: 9000 }), { amount: 2000, unit: "week" });
  assert.equal(mainPrice({ rentPerDay: null, rentPerWeek: null, sellPrice: null }), null);
});

test("availability", () => {
  assert.equal(availability([{ stockCount: 2, availableCount: 1, freeFromDate: null }]).kind, "available");
  const r = availability([
    { stockCount: 1, availableCount: 0, freeFromDate: d("2026-11-20") },
    { stockCount: 1, availableCount: 0, freeFromDate: d("2026-11-15") },
  ]);
  assert.deepEqual(r, { kind: "rented", freeFrom: d("2026-11-15") });
  assert.equal(availability([{ stockCount: 1, availableCount: 0, freeFromDate: null }]).kind, "allRented");
});

test("rankScore orders available, rented, all rented; featured up; stale down", () => {
  const now = d("2026-11-13");
  const base = { isFeatured: false, lastSellerTouchAt: d("2026-11-10"), createdAt: d("2026-11-01") };
  const avail = { ...base, sizes: [{ stockCount: 1, availableCount: 1, freeFromDate: null }] };
  const rented = { ...base, sizes: [{ stockCount: 1, availableCount: 0, freeFromDate: d("2026-11-20") }] };
  const gone = { ...base, sizes: [{ stockCount: 1, availableCount: 0, freeFromDate: null }] };
  const s = (p: Rankable) => rankScore(p, now, 30);
  assert.ok(s(avail) < s(rented) && s(rented) < s(gone));
  assert.ok(s({ ...avail, isFeatured: true }) < s(avail));
  assert.ok(s(avail) < s({ ...avail, lastSellerTouchAt: d("2026-09-01") }));
  assert.ok(s({ ...avail, lastSellerTouchAt: d("2026-09-01") }) < s(rented)); // stale but available still beats rented
});

test("enquiryMessage", () => {
  const m = enquiryMessage("hi", { title: "Green Lehenga – Women", code: "R1042", url: "https://x/p/R1042", size: "M" });
  assert.equal(m, "Namaste 🙏 Mujhe yeh dress chahiye:\n👗 Green Lehenga – Women\n🔖 Code: R1042\n📏 Size: M\n🔗 https://x/p/R1042\nKya yeh available hai?");
  assert.ok(!enquiryMessage("en", { title: "t", code: "R1", url: "u" }).includes("Size"));
  assert.equal(waLink("+919876543210", "a b"), "https://api.whatsapp.com/send?phone=919876543210&text=a%20b");
  // emoji must reach WhatsApp as UTF-8 percent-escapes, not lone surrogates
  assert.ok(waLink("+919876543210", "🙏").endsWith("text=%F0%9F%99%8F"));
});

test("filters round-trip and reject junk", () => {
  const f = parseFilters({ occasion: "haldi,wedding", colour: "red,<x>", min: "500", sort: "bogus", page: "2" });
  assert.deepEqual(f.occasion, ["haldi", "wedding"]);
  assert.deepEqual(f.colour, ["red"]);
  assert.equal(f.min, 500);
  assert.equal(f.sort, "recommended");
  assert.equal(filterHref("/", f, { occasion: toggle(f.occasion, "haldi") }), "/?occasion=wedding&colour=red&min=500");
  assert.equal(filterHref("/", parseFilters({}), {}), "/");
});
