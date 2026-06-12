import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, phonesMatch, isLikelyValidPhone } from "./phone";

test("normalizePhone: strips separators, country code, leading zeros", () => {
  assert.equal(normalizePhone("99999999"), "99999999");
  assert.equal(normalizePhone("+965 99999999"), "99999999");
  assert.equal(normalizePhone("00965-99999999"), "99999999");
  assert.equal(normalizePhone("(965) 99999999"), "99999999");
  assert.equal(normalizePhone("099999999"), "99999999");
});

test("normalizePhone: converts Arabic-Indic digits", () => {
  assert.equal(normalizePhone("٩٩٩٩٩٩٩٩"), "99999999");
  assert.equal(normalizePhone("١٢٣٤٥٦٧٨"), "12345678");
});

test("normalizePhone: empty / nullish inputs", () => {
  assert.equal(normalizePhone(""), "");
  assert.equal(normalizePhone(null), "");
  assert.equal(normalizePhone(undefined), "");
  assert.equal(normalizePhone("no digits"), "");
});

test("phonesMatch: same number in different formats", () => {
  assert.equal(phonesMatch("99999999", "+965 9999 9999"), true);
  assert.equal(phonesMatch("٩٩٩٩٩٩٩٩", "99999999"), true);
  assert.equal(phonesMatch("99999999", "88888888"), false);
});

test("phonesMatch: rejects too-short inputs (no false matches)", () => {
  assert.equal(phonesMatch("12345", "12345"), false); // < 6 digits
  assert.equal(phonesMatch("", ""), false);
});

test("isLikelyValidPhone: accepts 7-12 digits, rejects outside", () => {
  assert.equal(isLikelyValidPhone("99999999"), true);
  assert.equal(isLikelyValidPhone("1234567"), true); // 7
  assert.equal(isLikelyValidPhone("123456"), false); // 6
  assert.equal(isLikelyValidPhone("1234567890123"), false); // 13
  assert.equal(isLikelyValidPhone(""), false);
});
