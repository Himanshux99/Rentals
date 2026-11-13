import assert from "node:assert/strict";
import { test } from "node:test";
import { isOwnKey, productPrefix } from "./upload-key";

test("isOwnKey", () => {
  const p = productPrefix("shop1");
  const id = "a".repeat(32);
  assert.ok(isOwnKey(`products/shop1/${id}.webp`, p));
  assert.ok(isOwnKey(`products/shop1/${id}-og.jpg`, p));
  assert.ok(!isOwnKey(`products/shop2/${id}.webp`, p));
  assert.ok(!isOwnKey(`products/shop1/../shop2/${id}.webp`, p));
  assert.ok(!isOwnKey(`products/shop1/${id}.png`, p));
  assert.ok(!isOwnKey(`products/shop1x/${id}.webp`, p));
});
