# Controlled Live Debug Runbook

This runbook governs human-approved live uTradeHub debugging for `구매확인서` draft-generation issues. It is not part of default verification. `npm run verify` must remain zero-network and zero-browser unless a developer explicitly opts into a gated live session.

## Hard Boundary

The agent may help create only `임시저장` drafts. The agent must never click or confirm final `발급`, `제출`, `전송`, or equivalent issuance/submission actions. Final review and issuance remain manual operator decisions inside uTradeHub.

Credentials, LLM keys, private supplier mappings, screenshots, HTML captures, traces, HAR files, and diagnostic dumps can contain sensitive account, supplier, order, or portal data. Keep them in git-ignored local paths such as `.diagnostics/` or an operator-approved `UTH_DIAG_DIR`. Do not commit them.

## Operator Approval Points

The operator must explicitly approve each of these before the agent proceeds:

1. Starting a controlled live-debug session against the real portal.
2. Which browser-control method will be used: Playwright MCP/browser automation or Chrome control against the operator-visible Chrome session.
3. Whether credentials are typed manually by the operator or supplied interactively for this session only. Credentials must remain memory-only.
4. The exact test input: PDF/order, supplier group, mapping file, and intended draft-generation path.
5. Enabling `UTH_DIAG=1` and choosing the diagnostic output directory.
6. Proceeding from populated `settle_totals` to the single allowed `임시저장` action.

## Allowed Actions

Portal operation is limited to the known draft-generation flow, in order:

```text
login
open_form
fill_basic_info
select_supplier
fill_line_items
settle_totals
임시저장
```

Read-only diagnostics are allowed at any point: DOM reads, frame enumeration, screenshots, HTML snapshots, form field dumps, visible-vs-hidden totals inspection, dialog logs, console logs, and optional trace/network summaries.

## Forbidden Actions

The agent must not perform any of these in a live portal session:

- Click or confirm final `발급`, `제출`, `전송`, or equivalent issuance/submission actions.
- Click unknown buttons or try unrelated portal controls to discover behavior.
- Navigate unrelated menus, edit existing drafts, delete portal data, refresh as an experiment, or retry actions outside the approved flow.
- Persist credentials, API keys, private supplier mappings, or private business artifacts.
- Commit diagnostic artifacts or copy them outside local git-ignored diagnostic paths.
- Treat live debugging as a replacement for deterministic tests and local verification.

## Stop Conditions

Stop portal operation immediately when any of these occurs:

- The page, dialog, frame, or action no longer matches the approved flow.
- A final-submission style prompt appears, including `발급`, `제출`, `전송`, or equivalent wording.
- `viewForm.totQty` or `viewForm.totAmt` is blank, zero, missing, or inconsistent at `settle_totals`.
- A portal error, session timeout, login issue, unexpected popup, missing iframe, selector drift, or network failure changes the expected state.
- The operator withdraws approval, asks to pause, or needs to manually inspect the portal.

When a stop condition occurs, collect only read-only diagnostics, report the observed state, and wait for operator guidance before any further portal action.

## Browser Attach Procedure

Use the safest available method for the session and document it in the start template.

For Playwright MCP or an agent-owned browser:

1. Confirm the operator approves a live browser session and the exact target flow.
2. Start from a visible browser window. Do not use headless mode for live portal work.
3. Enter credentials only through the approved memory-only path or let the operator type them manually.
4. Drive only the allowed flow, collecting read-only diagnostics before and after risky transitions.
5. Stop at `settle_totals` if totals are missing; otherwise ask for approval before `임시저장`.

For Chrome control against the operator's existing browser:

1. Confirm the operator wants the agent to attach to the visible Chrome session and identify the intended tab.
2. Verify the current page is at the expected uTradeHub state before interacting.
3. If the tab is already logged in, treat the existing session as operator-approved only for the named flow.
4. Do not inspect unrelated tabs or browser state.
5. Continue only while the tab remains on the approved draft-generation path.

## Session Start Template

```text
Controlled live debug session start

Operator approval:
- Approved live portal operation: yes/no
- Approved browser method: Playwright MCP / Chrome control
- Approved credential path: operator types manually / session-only interactive entry
- Approved diagnostic mode: UTH_DIAG=1 yes/no
- Diagnostic directory: .diagnostics/ or UTH_DIAG_DIR=<path>

Test input:
- PDF/order identifier:
- Supplier group:
- Mapping file or mapping source:
- Expected line count:
- Expected total quantity:
- Expected total amount:

Allowed flow for this session:
login -> open_form -> fill_basic_info -> select_supplier -> fill_line_items -> settle_totals -> 임시저장

Planned stop points:
- Stop and report if portal state is unexpected.
- Stop and report if totals are blank, zero, missing, or inconsistent at settle_totals.
- Stop and report on any 발급/제출/전송 prompt.
- Ask before clicking 임시저장 even when totals are populated.
```

## UTH_DIAG=1 Diagnostics Inspection

Enable diagnostics only for an approved debug session:

```powershell
$env:UTH_DIAG = "1"
$env:UTH_DIAG_DIR = ".diagnostics"
```

After a `settle_totals` stop, inspect the local diagnostic directory before changing automation code. The exact filenames can vary by run, but the evidence should answer these questions:

- Which frames existed, and what were their URLs?
- Was the expected main form frame present?
- What were `viewForm.totQty` and `viewForm.totAmt`?
- Did visible total fields differ from hidden/control totals?
- Were line-item rows committed before returning from the popup?
- Did dialogs, console messages, or network/trace summaries show a portal error?
- Do screenshots and HTML snapshots match the state described in the report?

Treat all artifacts as sensitive. Screenshots, HTML, form dumps, traces, HAR files, and summaries may include account identifiers, supplier data, order contents, or portal session context. Keep them under `.diagnostics/` or another git-ignored local `UTH_DIAG_DIR`; do not attach them to public issues, commit them, or paste them into logs without redaction.

## Session Stop / Report Template

```text
Controlled live debug session report

Session result:
- Completed allowed flow to 임시저장: yes/no
- Stop reason:
- Last approved operation:
- Last observed portal state:

Totals evidence:
- viewForm.totQty:
- viewForm.totAmt:
- Visible total quantity:
- Visible total amount:
- Hidden/control totals:
- Expected quantity/amount:

Artifacts collected:
- Diagnostic directory:
- Screenshots:
- HTML snapshots:
- Frame list / frame URLs:
- Form dump:
- Dialog log:
- Console log:
- Trace/network summary:

Safety boundary:
- No final 발급/제출/전송 action clicked: yes/no
- Credentials persisted: no
- Artifacts committed: no

Next hypothesis:
- Most likely failure point:
- Evidence supporting it:
- Next deterministic test or local reproduction step:
- Whether another live session needs operator approval:
```
