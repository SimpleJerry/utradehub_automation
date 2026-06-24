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
