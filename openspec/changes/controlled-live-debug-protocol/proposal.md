## Why

The latest live uTradeHub test stopped correctly before `임시저장`, but the parent form totals still did not populate. Operator-only live testing loses the decisive evidence needed to tell whether the failure is a wrong field read, a missed callback, a line-item commit issue, or a portal state change.

We need a controlled live-debug workflow where the agent can observe and operate the same real flow under explicit boundaries, without turning live debugging into exploratory portal clicking or crossing the human gate.

## What Changes

- Introduce a controlled live-debug protocol for uTradeHub sessions.
- Allow agent operation only along the existing known flow: `login → open_form → fill_basic_info → select_supplier → fill_line_items → settle_totals → 임시저장`.
- Forbid extra portal clicks, unknown-button experiments, and all final `발급` / `제출` / `전송` actions.
- Define read-only diagnostics to collect during live debugging: screenshots, HTML, frame list, form field dumps, visible-vs-hidden totals, dialog log, and optional trace/network summaries.
- Define stop conditions: unknown portal state, total fields not populated at `settle_totals`, or any final-submission style prompt.
- Keep default verification zero-network and zero-browser; live debugging remains an explicit human-gated activity.

## Capabilities

### New Capabilities

- `controlled-live-debug`: A human-gated protocol for controlled agent-assisted live uTradeHub debugging with explicit operation boundaries and diagnostic evidence requirements.

### Modified Capabilities

- None.

## Impact

- Adds OpenSpec governance for Playwright MCP/Chrome-assisted live debug sessions.
- Future implementation may affect debug tooling, `UTH_DIAG=1` diagnostics, and runbook/checklist documentation.
- No change to production draft submission behavior in this proposal.
- No credential persistence, no default CI live-browser testing, and no final issuance/submission automation.
