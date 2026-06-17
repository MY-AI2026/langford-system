import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeForSearch, fuzzyMatch, fuzzyMatchAny } from "./search";

test("normalizeForSearch: folds Arabic letter variants + digits", () => {
  assert.equal(normalizeForSearch("أحمد"), "احمد");
  assert.equal(normalizeForSearch("فاطمة"), "فاطمه"); // taa marbutah
  assert.equal(normalizeForSearch("مصطفى"), "مصطفي"); // alef maksura
  assert.equal(normalizeForSearch("٩٩"), "99");
  assert.equal(normalizeForSearch("  Hello   World  "), "hello world");
});

test("fuzzyMatch: direct substring + empty query", () => {
  assert.equal(fuzzyMatch("Ahmed Elsayed", "ahmed"), true);
  assert.equal(fuzzyMatch("Ahmed", ""), true); // empty query matches all
  assert.equal(fuzzyMatch("Ahmed", "xyz"), false);
});

test("fuzzyMatch: alef-variant insensitive", () => {
  assert.equal(fuzzyMatch("أحمد", "احمد"), true);
  assert.equal(fuzzyMatch("احمد", "أحمد"), true);
});

test("fuzzyMatch: multi-word in any order", () => {
  assert.equal(fuzzyMatch("Ahmed Mohamed Elsayed", "elsayed ahmed"), true);
  assert.equal(fuzzyMatch("Ahmed Mohamed", "ahmed sara"), false);
});

test("fuzzyMatch: char-in-order typo tolerance (>=3 chars)", () => {
  assert.equal(fuzzyMatch("ahmed", "ahmd"), true); // dropped a letter
  assert.equal(fuzzyMatch("ahmed", "xz"), false); // < 3 chars, no substring
});

test("fuzzyMatchAny: OR across fields", () => {
  const fields = ["Ahmed", "99999999", "a@b.com"];
  assert.equal(fuzzyMatchAny(fields, "9999"), true);
  assert.equal(fuzzyMatchAny(fields, "a@b"), true);
  assert.equal(fuzzyMatchAny(fields, "zzz"), false);
});
