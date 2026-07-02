## ADDED Requirements

### Requirement: Controlled live debug sessions use an explicit operation whitelist

Controlled live debug sessions SHALL allow agent portal operation only along the approved uTradeHub draft-generation flow: `login`, `open_form`, `fill_basic_info`, `select_supplier`, `fill_line_items`, `settle_totals`, and `임시저장`.

#### Scenario: Agent follows the approved flow

- **WHEN** an operator approves a controlled live debug session
- **AND** the portal remains on the expected draft-generation path
- **THEN** the agent may perform only the next action in the approved flow

#### Scenario: Portal reaches an unexpected state

- **WHEN** the portal presents a state or action outside the approved flow
- **THEN** the agent MUST stop portal operation
- **AND** the agent MUST ask the operator for guidance before any further portal action

### Requirement: Controlled live debug sessions forbid exploratory portal clicks

Controlled live debug sessions SHALL NOT use the real portal for undefined exploratory clicking, unknown button trials, unrelated menu navigation, page refresh experiments, deletion, editing existing drafts, or other actions outside the approved flow.

#### Scenario: Diagnostic information is needed

- **WHEN** the agent needs more information about the current portal state
- **THEN** the agent SHALL use read-only diagnostics such as DOM reads, screenshots, frame enumeration, HTML snapshots, dialog logs, console logs, or trace/network inspection
- **AND** the agent SHALL NOT click additional portal controls to discover behavior

### Requirement: Final submission actions remain prohibited

Controlled live debug sessions SHALL NOT click or confirm final `발급`, `제출`, `전송`, or equivalent irreversible issuance/submission actions.

#### Scenario: Final-submission prompt appears

- **WHEN** a dialog or page prompt asks to perform final issuance, submission, or transmission
- **THEN** the agent MUST dismiss or avoid the action
- **AND** the session MUST stop for operator review

### Requirement: Missing totals stop before temporary save

Controlled live debug sessions SHALL stop at `settle_totals` when parent-form total quantity or total amount remains blank or zero.

#### Scenario: Totals are not populated

- **WHEN** line items have been entered
- **AND** `viewForm.totQty` or `viewForm.totAmt` remains blank or zero at `settle_totals`
- **THEN** the agent SHALL NOT click `임시저장`
- **AND** the agent SHALL collect diagnostic evidence for the missing totals

#### Scenario: Totals are populated

- **WHEN** line items have been entered
- **AND** `viewForm.totQty` and `viewForm.totAmt` are both present and non-zero
- **THEN** the agent may continue to the single approved `임시저장` action

### Requirement: Live debug diagnostics are local and non-committed

Controlled live debug sessions SHALL keep diagnostic artifacts local in git-ignored paths and SHALL NOT persist credentials or commit private business artifacts.

#### Scenario: Diagnostics are captured

- **WHEN** a controlled live debug session captures screenshots, HTML, frame lists, form dumps, dialog logs, traces, or network summaries
- **THEN** those artifacts SHALL be written only to local git-ignored diagnostic paths
- **AND** credentials, LLM keys, private mappings, and private supplier data SHALL NOT be committed

### Requirement: Default verification remains offline

The controlled live debug protocol SHALL NOT add live portal, browser, or network requirements to the default verification command.

#### Scenario: Default verification runs

- **WHEN** `npm run verify` is executed without live-debug opt-in flags
- **THEN** it SHALL remain zero-network and zero-browser
- **AND** live portal validation SHALL remain a separate human-gated activity
