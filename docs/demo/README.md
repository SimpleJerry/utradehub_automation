# Demo Assets

This directory is the public-facing demo package for the uTradeHub automation project.
It is separate from test fixtures and must contain only redacted, non-sensitive assets.

## Intended Contents

- `sample-po-redacted.pdf`: redacted purchase-order PDF that preserves the original layout shape.
- `sample-vendor-mapping.csv`: demo supplier mapping keyed by English Pay-to Vendor name.
- `expected-preview.json`: expected dry-run preview shape for the redacted sample.
- `walkthrough.md`: step-by-step demo narrative for reviewers.
- `demo.gif`: short README-friendly capture of the local workflow.
- `screenshots/`: still images used by README or portfolio writeups.

## Redaction Rules

Before adding any PDF, screenshot, GIF, or video:

- Replace real supplier names, company names, BPO numbers, product names, prices, quantities, account IDs, and portal-specific identifiers.
- Preserve enough visual structure to show why PDF layout reconstruction matters.
- Blur or crop portal account/session details in all screenshots and recordings.
- Do not include uTradeHub credentials, LLM API keys, private supplier mappings, diagnostics, traces, HAR files, or live portal HTML.
- Keep the hard boundary visible in the demo: the tool may create only `임시저장` drafts and never performs final `발급` or `제출`.

## Demo Story

The demo should show this sequence:

1. Load a redacted PO PDF and demo vendor mapping.
2. Run dry-run preview without touching the browser.
3. Review extracted groups, line items, validation status, and skipped rows.
4. Explicitly approve the intended groups and confirm operator review.
5. Drive Chrome only to the `임시저장` draft step.
6. Show the batch report and note that final issuance remains manual.

