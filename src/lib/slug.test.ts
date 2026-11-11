import assert from "node:assert/strict";
import { test } from "node:test";
import { INDIAN_MOBILE, slugBase } from "./slug";

test("slugBase", () => {
  assert.equal(slugBase("Shree Ganesh Dress House"), "shree-ganesh-dress-house");
  assert.equal(slugBase("  Rani's  Collection!! "), "rani-s-collection");
  assert.equal(slugBase("श्री गणेश ड्रेस"), "shop");
  assert.equal(slugBase("Café 21"), "cafe-21");
  assert.ok(slugBase("x".repeat(100)).length <= 40);
});

test("INDIAN_MOBILE", () => {
  assert.ok(INDIAN_MOBILE.test("+919876543210"));
  assert.ok(!INDIAN_MOBILE.test("+915876543210"));
  assert.ok(!INDIAN_MOBILE.test("9876543210"));
  assert.ok(!INDIAN_MOBILE.test("+91987654321"));
});
