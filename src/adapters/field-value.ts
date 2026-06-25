/**
 * The 구매물품 line-item popup echoes server-normalised values back into #qty / #untPrc whenever a
 * setSumAmt recalc resolves — adding thousands separators (in_comma) and stripping trailing zeros.
 * A recalc fired while 수량 was still empty (the 단가 onblur triggers one before we type quantity)
 * can land late and overwrite a freshly-typed quantity with the server's empty-quantity echo,
 * collapsing e.g. 100 → 1. To re-assert the intended quantity we must compare ignoring those
 * display-only differences, so we never refight the site's own formatting.
 *
 * Returns true when `current` should be re-filled to `expected` (they differ once thousands
 * separators and surrounding whitespace are removed).
 */
export function numericValueDiffers(current: string, expected: string): boolean {
  const normalise = (s: string): string => s.replace(/,/g, "").trim();
  return normalise(current) !== normalise(expected);
}

/**
 * After the line-item popup closes, the parent's async `fnc_linepop` callback fetches the totals
 * from the server and writes them into the main form's viewForm.totQty / viewForm.totAmt. The
 * driver must not 임시저장 until that lands, or blank totals get saved. A total counts as
 * "populated" only when it is present AND not a zero placeholder — the server's pre-callback value
 * is empty, and a stray "0"/"0.00" would be just as wrong to commit. Thousands separators (the
 * site's out_comma formatting) are stripped before the check so "1,234" reads as populated.
 */
function isPopulatedTotal(raw: string): boolean {
  const value = raw.replace(/,/g, "").trim();
  if (value === "") return false;
  return Number.parseFloat(value) > 0;
}

/** True only once BOTH totals are present and non-zero — the gate for proceeding to 임시저장. */
export function totalsArePopulated(totQty: string, totAmt: string): boolean {
  return isPopulatedTotal(totQty) && isPopulatedTotal(totAmt);
}
