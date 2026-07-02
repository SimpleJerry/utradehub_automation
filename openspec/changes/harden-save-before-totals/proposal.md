## Why

The Playwright driver already waits for the uTradeHub parent form totals after line items are added, because `임시저장` posts `viewForm.totQty` and `viewForm.totAmt`. If those fields are still blank or zero, the saved draft can be materially incomplete even though the line-item popup appeared to finish.

The current implementation logs decisive evidence when totals do not populate, but then continues into `saveDraft`. That makes an async site race look like a successful draft-generation attempt. The safer behavior is to stop before save and report a clear operator-visible failure.

## What Changes

- Treat populated parent-form totals as a hard pre-save gate when the submission plan contains line items.
- If totals remain blank or zero after the bounded wait and one read-only refresh retry, fail the draft flow at `settle_totals`.
- Preserve diagnostics: log the last observed totals, callback type, deep dump under `UTH_DIAG=1`, and normal failure snapshots.
- Do not change the human gate or final-submit boundary: the driver still only targets `임시저장` and still dismisses issuance-style `발급` / `제출` / `전송` confirmations.

## Impact

- A live run may now fail earlier with `site_flow_error[settle_totals]` instead of creating a questionable temporary draft.
- Operators get a clearer signal that the site did not finish computing totals and should retry or inspect the portal state.
- Default verification remains zero-network and zero-browser.
