import assert from "node:assert/strict";
import { test } from "node:test";
import { isMaterialEdit, statusOnCreate, statusOnEdit, type PublicContent } from "./moderation";

test("statusOnCreate follows Direct Upload Mode", () => {
  assert.equal(statusOnCreate(false), "pending");
  assert.equal(statusOnCreate(true), "approved");
});

test("statusOnEdit", () => {
  // approved: only material edits with review on go back to the queue
  assert.equal(statusOnEdit("approved", true, false), "pending");
  assert.equal(statusOnEdit("approved", false, false), "approved");
  assert.equal(statusOnEdit("approved", true, true), "approved");
  // pending stays pending whatever the mode
  assert.equal(statusOnEdit("pending", true, true), "pending");
  assert.equal(statusOnEdit("pending", false, false), "pending");
  // rejected is resubmitted, never auto-approved
  assert.equal(statusOnEdit("rejected", false, false), "pending");
  assert.equal(statusOnEdit("rejected", true, true), "pending");
});

const base: PublicContent = {
  categoryId: "c1",
  forWhomIds: ["w"],
  ageRangeIds: [],
  occasionIds: ["o1", "o2"],
  setPieceIds: [],
  fabricIds: [],
  workIds: [],
  colourIds: ["red"],
  imageKeys: ["a.webp", "b.webp"],
  rentPerDay: 500,
  rentPerWeek: null,
  sellPrice: null,
  securityDeposit: 1000,
  description: null,
};

test("isMaterialEdit", () => {
  assert.equal(isMaterialEdit(base, { ...base }), false);
  // order and empty-vs-null don't count
  assert.equal(isMaterialEdit(base, { ...base, occasionIds: ["o2", "o1"], imageKeys: ["b.webp", "a.webp"], description: "" }), false);
  assert.equal(isMaterialEdit(base, { ...base, rentPerDay: 600 }), true);
  assert.equal(isMaterialEdit(base, { ...base, imageKeys: ["a.webp", "c.webp"] }), true);
  assert.equal(isMaterialEdit(base, { ...base, description: "New text" }), true);
  assert.equal(isMaterialEdit(base, { ...base, colourIds: ["red", "gold"] }), true);
});
