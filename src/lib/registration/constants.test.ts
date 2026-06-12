import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCommission, ACCEPTIX_COMMISSION_RATE } from "./constants";

test("computeCommission: default 10% rate", () => {
  assert.equal(computeCommission(100), 10);
  assert.equal(computeCommission(250), 25);
  assert.equal(ACCEPTIX_COMMISSION_RATE, 0.1);
});

test("computeCommission: zero / negative / missing fee → 0", () => {
  assert.equal(computeCommission(0), 0);
  assert.equal(computeCommission(-50), 0);
  // @ts-expect-error testing defensive runtime guard
  assert.equal(computeCommission(undefined), 0);
});

test("computeCommission: rounds to 3 decimals (KWD fils)", () => {
  // 33.333 * 0.1 = 3.3333 → 3.333
  assert.equal(computeCommission(33.333), 3.333);
  // 12.3456 * 0.1 = 1.23456 → 1.235
  assert.equal(computeCommission(12.3456), 1.235);
});

test("computeCommission: custom rate", () => {
  assert.equal(computeCommission(200, 0.15), 30);
  assert.equal(computeCommission(100, 0.075), 7.5);
});
