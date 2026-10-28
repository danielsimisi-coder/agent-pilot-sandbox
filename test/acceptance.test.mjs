import { test } from "node:test";
import assert from "node:assert/strict";
import { segmentsFor } from "../src/segments.mjs";

const NOW = new Date("2026-10-28T12:00:00Z");
const DAY = 86_400_000;
const ago = (d) => new Date(NOW.getTime() - d * DAY).toISOString();
const base = { source: "app_signup", isRegistered: true, purchases: [], calls: [] };
const seg = (c) => segmentsFor({ ...base, ...c }, NOW);

test("wix lead not registered", () => {
  assert.deepEqual(seg({ source: "wix_form", isRegistered: false }), ["wix_lead"]);
});
test("registered, no purchase", () => {
  assert.deepEqual(seg({}), ["registered_no_purchase"]);
});
test("purchased, no call", () => {
  assert.deepEqual(seg({ purchases: [{ at: ago(1), amount: 50 }] }), ["purchased_no_call"]);
});
test("first call exactly 14 days ago, no repurchase", () => {
  const s = seg({ purchases: [{ at: ago(20), amount: 50 }], calls: [{ startedAt: ago(14) }] });
  assert.ok(s.includes("first_call_no_repurchase"));
});
test("first call 13 days ago is too early", () => {
  const s = seg({ purchases: [{ at: ago(20), amount: 50 }], calls: [{ startedAt: ago(13) }] });
  assert.ok(!s.includes("first_call_no_repurchase"));
});
test("repurchase after the first call removes segment 4", () => {
  const s = seg({ purchases: [{ at: ago(30), amount: 50 }, { at: ago(5), amount: 50 }],
                  calls: [{ startedAt: ago(20) }, { startedAt: ago(16) }] });
  assert.ok(!s.includes("first_call_no_repurchase"));
});
test("repeat customer", () => {
  assert.ok(seg({ purchases: [{ at: ago(3), amount: 10 }, { at: ago(2), amount: 10 }] }).includes("repeat"));
});
test("inactive at exactly 60 days", () => {
  assert.ok(seg({ purchases: [{ at: ago(60), amount: 10 }], calls: [{ startedAt: ago(59) }] }).includes("inactive"));
});
test("heavy: exactly 1000 is not heavy", () => {
  assert.ok(!seg({ purchases: [{ at: ago(1), amount: 1000 }] }).includes("heavy"));
});
test("heavy: 1000.01 inside 30 days is heavy", () => {
  assert.ok(seg({ purchases: [{ at: ago(1), amount: 600 }, { at: ago(29), amount: 400.01 }] }).includes("heavy"));
});
test("heavy: a purchase exactly 30 days ago does not count", () => {
  assert.ok(!seg({ purchases: [{ at: ago(30), amount: 5000 }] }).includes("heavy"));
});
test("output is sorted", () => {
  const s = seg({ purchases: [{ at: ago(70), amount: 10 }, { at: ago(65), amount: 10 }] });
  assert.deepEqual(s, [...s].sort());
});
test("validation: negative amount throws", () => {
  assert.throws(() => seg({ purchases: [{ at: ago(1), amount: -1 }] }), TypeError);
});
test("validation: bad date throws", () => {
  assert.throws(() => seg({ calls: [{ startedAt: "not-a-date" }] }), TypeError);
});
