/**
 * Fuzzy search utilities tuned for Arabic + English text used in this app.
 *
 * Why not Fuse.js: adds ~30KB to the bundle for one feature. Hand-rolled
 * normalization + substring match handles 95% of real-world typos for
 * Arabic names and phone numbers in this product.
 *
 * Normalization handles:
 *   - case folding
 *   - Arabic-Indic digits   (٩٩ → 99)
 *   - alef variants         (إ/أ/آ → ا)
 *   - taa marbutah          (ة → ه)
 *   - alef maksura          (ى → ي)
 *   - hamza on yaa          (ئ → ي)
 *   - whitespace collapse
 */

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeForSearch(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ئ/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns true if `query` matches `text`. Match strategies (cheapest first):
 *   1. Direct substring of normalized text.
 *   2. All space-separated words in query appear (in any order) in text.
 *   3. (Last resort) chars of query appear in order — catches typos like
 *      "ahmd" → "ahmed".
 */
export function fuzzyMatch(
  text: string | null | undefined,
  query: string
): boolean {
  if (!query) return true;
  const t = normalizeForSearch(text || "");
  const q = normalizeForSearch(query);
  if (!q) return true;

  if (t.includes(q)) return true;

  // Multi-word: every word must appear somewhere
  const words = q.split(" ").filter(Boolean);
  if (words.length > 1 && words.every((w) => t.includes(w))) return true;

  // Char-in-order fuzzy (typo tolerance) — only when query >= 3 chars
  if (q.length < 3) return false;
  let i = 0;
  for (const c of t) {
    if (c === q[i]) i++;
    if (i === q.length) return true;
  }
  return false;
}

/**
 * Match a query against multiple fields of an object (OR semantics).
 * Useful for searching students by name OR phone OR civil-id OR email.
 */
export function fuzzyMatchAny(
  fields: Array<string | null | undefined>,
  query: string
): boolean {
  if (!query) return true;
  return fields.some((f) => fuzzyMatch(f, query));
}
