// ponytail: date_paiement is free text "JJ/MM/AAAA" with mixed padding
// ("6/2/2026" vs "06/02/2026") and created_at is ISO — lexicographic compare
// of either against the other is wrong. Everything that sorts, groups or
// filters dates goes through these parsers.

/** Parse a date string to a timestamp. Supports FR "JJ/MM/AAAA" (1- or 2-digit),
 *  bare ISO "AAAA-MM-JJ", and full ISO timestamps. Invalid/empty → NaN. */
export function parseDateMs(v: unknown): number {
  if (typeof v !== "string") return NaN;
  const s = v.trim();
  if (!s) return NaN;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) {
    const d = Number(fr[1]);
    const m = Number(fr[2]);
    if (m < 1 || m > 12 || d < 1 || d > 31) return NaN;
    // local midnight so comparisons against DatePicker values match
    return new Date(Number(fr[3]), m - 1, d).getTime();
  }
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (m < 1 || m > 12 || d < 1 || d > 31) return NaN;
    return new Date(y, m - 1, d).getTime();
  }
  return Date.parse(s);
}

/** Chronological compare for sorting. Invalid/empty dates sort first (asc). */
export function compareFrDates(a: string | null | undefined, b: string | null | undefined): number {
  const av = parseDateMs(a);
  const bv = parseDateMs(b);
  const aOk = !Number.isNaN(av);
  const bOk = !Number.isNaN(bv);
  if (aOk && bOk) return av - bv;
  if (aOk) return 1; // b invalid → a after b (invalid first in asc)
  if (bOk) return -1;
  return 0;
}

/** Normalize a date string to zero-padded "JJ/MM/AAAA" at write time.
 *  Anything that isn't FR format passes through unchanged. */
export function normalizeFrDate(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
  if (!s) return "";
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!fr) return s;
  return `${fr[1].padStart(2, "0")}/${fr[2].padStart(2, "0")}/${fr[3]}`;
}
