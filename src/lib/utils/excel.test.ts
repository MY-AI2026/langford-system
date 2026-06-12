import { test } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { pickColumn, parseWorkbookRows, type ParsedRow } from "./excel";

test("pickColumn: matches an alias case-insensitively", () => {
  const row: ParsedRow = { Name: "Ahmed", Phone: "99999999" };
  assert.equal(pickColumn(row, ["الاسم", "name"]), "Ahmed");
  assert.equal(pickColumn(row, ["phone", "mobile"]), "99999999");
});

test("pickColumn: respects alias priority order", () => {
  const row: ParsedRow = { "full name": "A", name: "B" };
  // "name" listed first wins even though "full name" also present
  assert.equal(pickColumn(row, ["name", "full name"]), "B");
});

test("pickColumn: returns '' when nothing matches or value empty", () => {
  const row: ParsedRow = { Name: "", Other: "x" };
  assert.equal(pickColumn(row, ["name"]), ""); // present but empty
  assert.equal(pickColumn(row, ["missing"]), "");
});

test("parseWorkbookRows: reads first sheet into header-keyed string rows", async () => {
  const ws = XLSX.utils.aoa_to_sheet([
    ["الاسم", "التليفون", "البريد"],
    ["أحمد السيد", "99999999", "a@b.com"],
    ["سارة", "012345678", ""],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  // type:"array" yields an ArrayBuffer, which is a valid BlobPart.
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const file = new File([buf], "students.xlsx");

  const rows = await parseWorkbookRows(file);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]["الاسم"], "أحمد السيد");
  assert.equal(rows[0]["التليفون"], "99999999");
  // raw:false keeps the leading zero as a display string
  assert.equal(rows[1]["التليفون"], "012345678");
});
