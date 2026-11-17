import assert from "node:assert/strict";
import { test } from "node:test";
import { videoBitrate } from "./convert";

test("videoBitrate keeps a full-length clip under the upload limit", () => {
  const bps = videoBitrate(50, 60);
  assert.ok(((bps + 128_000) * 60) / 8 < 50 * 1024 * 1024);
});

test("videoBitrate is clamped to 1..5 Mbps", () => {
  assert.equal(videoBitrate(50, 1), 5_000_000);
  assert.equal(videoBitrate(1, 600), 1_000_000);
});
