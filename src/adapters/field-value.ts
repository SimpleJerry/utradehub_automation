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

/** Operator-facing failure used when the driver refuses to save a draft with missing totals. */
export function describeTotalsGateFailure(totQty: string, totAmt: string): string {
  return `pre_save_totals_not_populated: totQty=${JSON.stringify(totQty)} totAmt=${JSON.stringify(totAmt)}`;
}

/** 人工门护栏：仅当原生弹窗是"是否真的去 발급/제출/전송"的疑问句时返回 true。
 *  saveDraft 对这类弹窗一律 dismiss、绝不 accept——accept 等于发起申请，越过仅限草稿(임시저장)的边界。
 *  注意：仅"提及"这些词的陈述句通知（如"…[전송]…발급신청이 완료됩니다"这类完成后提示）不算疑问句，返回 false，放行保存。 */
export function isIssuanceConfirmation(message: string): boolean {
  const issuanceTerms = ["발급", "제출", "전송"];
  const questionEndings = ["하시겠", "할까요"];
  return (
    issuanceTerms.some((t) => message.includes(t)) &&
    questionEndings.some((q) => message.includes(q))
  );
}
