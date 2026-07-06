## 1. Runbook and Session Guardrails

- [x] 1.1 Add a controlled live-debug runbook/checklist that states allowed actions, forbidden actions, stop conditions, and operator approval points.
- [x] 1.2 Add a session start template covering test input, credential handling, diagnostic flags, and the exact flow to be operated.
- [x] 1.3 Add a session stop/report template covering observed state, collected artifacts, stop reason, and next hypothesis.

## 2. Diagnostics

- [ ] 2.1 Enhance `UTH_DIAG=1` totals diagnostics so frame list, frame URLs, `viewForm` totals, visible totals, and hidden/control totals are emitted in a compact structured format.
- [ ] 2.2 Ensure diagnostic artifacts remain under git-ignored local paths and never include persisted credentials.
- [x] 2.3 Document how to inspect the diagnostics after a `settle_totals` stop.

## 3. Controlled Browser Operation

- [x] 3.1 Define the Playwright MCP / Chrome-control procedure for attaching to a live debug session.
- [x] 3.2 Encode the operation whitelist in the runbook: `login`, `open_form`, `fill_basic_info`, `select_supplier`, `fill_line_items`, `settle_totals`, `임시저장`.
- [x] 3.3 Define the mandatory stop behavior for unexpected portal states and final `발급` / `제출` / `전송` prompts.

## 4. Verification

- [ ] 4.1 Add or update deterministic tests for any new diagnostic formatting helpers.
- [ ] 4.2 Run targeted tests for changed diagnostic helpers.
- [ ] 4.3 Run `npm run verify` and confirm default verification remains zero-network and zero-browser.
