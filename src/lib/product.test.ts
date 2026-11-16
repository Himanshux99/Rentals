import assert from "node:assert/strict";
import { test } from "node:test";
import { productCode, productTitle } from "./product";

const lehenga = { nameEn: "Lehenga", nameHi: "लहंगा" };
const women = { nameEn: "Women", nameHi: "महिला" };
const red = { nameEn: "Red", nameHi: "लाल" };
const gold = { nameEn: "Gold", nameHi: "सुनहरा" };

test("productTitle", () => {
  assert.deepEqual(productTitle(lehenga, [{ nameEn: "Green", nameHi: "हरा" }], women), { titleEn: "Green Lehenga – Women", titleHi: "हरा लहंगा – महिला" });
  assert.deepEqual(productTitle(lehenga, [red, gold], women), { titleEn: "Red & Gold Lehenga – Women", titleHi: "लाल और सुनहरा लहंगा – महिला" });
  assert.equal(productTitle(lehenga, [red, gold, red], women).titleEn, "Multicolour Lehenga – Women");
});

test("productCode", () => {
  assert.equal(productCode(1042), "R1042");
});
