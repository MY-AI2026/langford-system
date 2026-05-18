/**
 * Phone number normalization utilities for Kuwait numbers.
 *
 * Goal: treat all of these as the same number when checking duplicates and
 * storing in Firestore — no more false negatives:
 *   "99999999", "+965 99999999", "00965-99999999",
 *   "(965) 99999999", "099999999", "٩٩٩٩٩٩٩٩"
 */

const ARABIC_TO_ASCII: Record<string, string> = {
  // Arabic-Indic digits
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  // Persian / Urdu digit variants (defensive)
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

/**
 * Normalize a phone number to its canonical 8-digit Kuwait form (digits only,
 * no country code, no leading zero, no separators).
 *
 * Returns "" if the input has no usable digits.
 */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";

  // 1) Convert Arabic / Persian digits to ASCII
  let s = raw
    .split("")
    .map((c) => ARABIC_TO_ASCII[c] ?? c)
    .join("");

  // 2) Strip everything that isn't a digit (spaces, dashes, parens, +, etc.)
  s = s.replace(/\D/g, "");

  // 3) Strip Kuwait country code
  //    "00965XXXXXXXX" → "XXXXXXXX"
  //    "965XXXXXXXX"   → "XXXXXXXX"  (only when there are 8+ digits after)
  if (s.startsWith("00965")) {
    s = s.slice(5);
  } else if (s.startsWith("965") && s.length > 8) {
    s = s.slice(3);
  }

  // 4) Strip leading zeros (e.g., "099999999" → "99999999")
  while (s.length > 8 && s.startsWith("0")) {
    s = s.slice(1);
  }

  return s;
}

/**
 * Returns true if two phone strings refer to the same number after normalization.
 * Requires at least 6 normalized digits so partial / empty inputs don't false-match.
 */
export function phonesMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  return na.length >= 6 && na === nb;
}

/**
 * Lightweight validity check — Kuwait local numbers are 8 digits, but we accept
 * 7–12 to be lenient for landlines / regional formats.
 */
export function isLikelyValidPhone(raw: string | null | undefined): boolean {
  const n = normalizePhone(raw);
  return n.length >= 7 && n.length <= 12;
}
