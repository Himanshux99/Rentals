import assert from "node:assert/strict";
import { test } from "node:test";
import { checkMedia, isVideoKey, stillKey } from "./media";

const img = { kind: "image", key: "a.webp" } as const;
const vid = { kind: "video", key: "b.mp4", posterKey: "b-poster.webp" } as const;

test("stillKey prefers the poster", () => {
  assert.equal(stillKey(img), "a.webp");
  assert.equal(stillKey(vid), "b-poster.webp");
});

test("isVideoKey", () => {
  assert.ok(isVideoKey("x.mp4"));
  assert.ok(!isVideoKey("x.mov"));
  assert.ok(!isVideoKey("x.webp"));
});

test("checkMedia accepts photos and up to the max videos", () => {
  checkMedia([img, vid, vid], 2);
});

test("checkMedia rejects bad slots", () => {
  assert.throws(() => checkMedia([vid, vid, vid], 2), /too many videos/);
  assert.throws(() => checkMedia([{ kind: "video", key: "b.mp4" }], 2), /poster/);
  assert.throws(() => checkMedia([{ ...img, posterKey: "p.webp" }], 2), /poster/);
  assert.throws(() => checkMedia([{ kind: "video", key: "b.webp", posterKey: "p.webp" }], 2), /video file/);
  assert.throws(() => checkMedia([{ kind: "image", key: "a.mp4" }], 2), /video file/);
});
