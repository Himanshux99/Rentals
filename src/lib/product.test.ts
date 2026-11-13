import assert from "node:assert/strict";
import { test } from "node:test";
import { productCode, productTitle } from "./product";

test("productTitle", () => {
  const t = productTitle({ nameEn: "Lehenga", nameHi: "लहंगा" }, { nameEn: "Green", nameHi: "हरा" }, { nameEn: "Women", nameHi: "महिला" });
  assert.deepEqual(t, { titleEn: "Green Lehenga – Women", titleHi: "हरा लहंगा – महिला" });
});

test("productCode", () => {
  assert.equal(productCode(1042), "R1042");
});
