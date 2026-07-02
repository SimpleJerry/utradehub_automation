## Context

The project automates Korean uTradeHub `구매확인서` draft generation and has a hard human gate: the tool may create `임시저장` drafts only and must never perform final `발급`, `제출`, or equivalent submission actions.

The latest live test of the pre-save totals gate stopped before saving because the parent form totals did not populate. That proved the safety gate works, but the current operator-only test loop does not preserve enough live evidence to diagnose why totals failed to land. The missing evidence includes frame state, visible totals DOM, hidden `viewForm` fields, popup commit status, `fnc_linepop` availability, dialogs, and network timing.

## Goals / Non-Goals

**Goals:**

- Define a controlled live-debug workflow for agent-assisted uTradeHub investigation.
- Let the agent operate only the exact known draft-generation path under user-approved conditions.
- Keep diagnostics read-only and evidence-oriented: screenshots, HTML, frame list, form dumps, visible-vs-hidden totals, dialogs, and optional traces.
- Preserve the human gate and credential boundaries.
- Make the workflow repeatable enough to drive Playwright reliability fixes without adding live browser dependencies to default verification.

**Non-Goals:**

- No autonomous final issuance or submission.
- No exploratory clicking on the live portal.
- No default CI/live-browser testing.
- No credential persistence or logging of private mappings, supplier data, or passwords.
- No replacement for deterministic unit tests or fixtures.

## Decisions

### Decision 1: Use a Controlled Operation Whitelist

The agent may operate only this known flow:

```text
login
open_form
fill_basic_info
select_supplier
fill_line_items
settle_totals
임시저장
```

Any portal state outside that flow is a stop condition. This preserves the value of live observation while preventing uncontrolled test-clicking against a real government/business portal.

Alternative considered: read-only observation only. That is safer but still forces the operator to manually reproduce the automated timing, which is the part most likely to matter for totals/callback races.

### Decision 2: Separate Operation From Diagnosis

Portal operation is limited to the whitelist. Diagnosis uses only read-only browser capabilities: DOM reads, screenshots, HTML snapshots, frame enumeration, dialog logs, console logs, and optional network/trace inspection.

Alternative considered: clicking extra portal controls to discover behavior. Rejected because it makes live debugging non-repeatable and risks crossing unknown portal workflows.

### Decision 3: Stop at `settle_totals` on Missing Totals

If `viewForm.totQty` and `viewForm.totAmt` remain blank or zero at `settle_totals`, the session stops and does not click `임시저장`. The diagnostic goal is to explain the missing totals, not to produce a questionable draft.

If totals are populated, the agent may proceed to the single expected `임시저장` action. Any final-submission style dialog must be dismissed and treated as a stop condition.

### Decision 4: Keep Live Debug Outside Default Verification

`npm run verify` remains zero-network and zero-browser. Live debug is a human-gated supplement used only when deterministic tests and local diagnostics cannot explain portal behavior.

## Risks / Trade-offs

- [Risk] The agent may encounter an unexpected portal state. -> Mitigation: stop immediately and ask the operator; do not infer or click.
- [Risk] Diagnostic artifacts may contain private business data. -> Mitigation: write only to git-ignored local diagnostics directories and never commit artifacts.
- [Risk] Controlled operation still uses real credentials and real portal state. -> Mitigation: operator explicitly authorizes each session and may enter credentials manually.
- [Risk] Live observation can become a substitute for tests. -> Mitigation: every fix still needs deterministic coverage where feasible plus `npm run verify`.

## Migration Plan

1. Add a live-debug checklist/runbook that states allowed actions, stop conditions, and diagnostic artifacts.
2. Enhance `UTH_DIAG=1` output so totals/frame/visible-vs-hidden evidence is easy to inspect after a failure.
3. Add a session start/stop template for operator approval and handoff.
4. Use the protocol for the next totals-not-populated investigation before changing portal automation again.

Rollback is simple: do not initiate controlled live-debug sessions. Existing app behavior and default verification are unchanged by the protocol itself.

## Open Questions

- Which connector should be primary for the first session: Playwright MCP against an agent-owned browser, or Chrome control against the operator's existing logged-in browser?
- Should the operator always type credentials manually, or can the agent type credentials when supplied interactively for the current session?
