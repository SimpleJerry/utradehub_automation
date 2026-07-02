## 1. Driver Behavior

- [x] 1.1 Change `waitForFormTotals` so timeout is a hard failure for plans with line items.
- [x] 1.2 Keep existing diagnostic logging and `UTH_DIAG=1` deep dump on both success and failure paths.
- [x] 1.3 Ensure failure surfaces through the existing `Result` error with step context before `saveDraft`.

## 2. Tests

- [x] 2.1 Add deterministic unit coverage for the pre-save totals gate failure message/helper.
- [x] 2.2 Run targeted tests for field-value behavior.
- [x] 2.3 Run `npm run verify` if the environment permits.

## 3. Handoff

- [x] 3.1 Report that live `SITE_E2E=1` portal validation is ready for human operation.

