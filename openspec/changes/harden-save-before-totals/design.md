## Design

### Pre-Save Totals Gate

`PlaywrightDriver.createDraft` already records the current step before calling `waitForFormTotals`. The implementation will make `waitForFormTotals` enforce this invariant:

> For any plan with one or more line items, both `viewForm.totQty` and `viewForm.totAmt` must be present and non-zero before `saveDraft` is called.

The wait behavior remains condition-based:

1. Poll parent-frame `document.viewForm.totQty` and `document.viewForm.totAmt`.
2. If both are populated, proceed.
3. After a short grace period, re-trigger the read-only `fnc_linepop` callback once.
4. Continue polling until the existing bounded deadline.
5. If still not populated, log diagnostics and throw an error.

The surrounding `createDraft` catch block converts that error into the existing `Result` failure shape, with step context `settle_totals`.

### Error Shape

The error should include the observed `totQty` and `totAmt` values. This keeps the report actionable without exposing credentials or private mapping data.

Example:

```text
site_flow_error[settle_totals]: Error: pre_save_totals_not_populated: totQty="" totAmt=""
```

### Non-Goals

- Do not assert exact totals. uTradeHub computes totals server-side, and exact matching would require duplicating portal behavior.
- Do not change line-item row-count verification in this change. That remains a separate follow-up.
- Do not add live portal automation to default tests.
