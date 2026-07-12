// Pairing codes are read aloud, texted, and typed by hand, so the alphabet
// drops every character that can be confused for another: 0/O, 1/I/L, and U
// (which people hear as "you"). What's left can only be typed one way.
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE_LENGTH = 8;

/** Strip formatting and casing so "abcd-efgh" and "ABCDEFGH" are the same code. */
export function normalizeCode(input) {
  if (!input) return "";
  return String(input)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODE_LENGTH);
}

/** Display form: ABCD-EFGH. Two short halves are far easier to read off a screen. */
export function formatCode(code) {
  const clean = normalizeCode(code);
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

export function isCompleteCode(code) {
  return normalizeCode(code).length === CODE_LENGTH;
}
