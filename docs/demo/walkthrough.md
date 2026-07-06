# Demo Walkthrough

Use this outline for the final README GIF/video and portfolio explanation.

## 1. Setup

- Open the installed local app or development server.
- Use `sample-vendor-mapping.csv`.
- Upload `sample-po-redacted.pdf` once it is available.
- Enter an LLM API key only for the current session.

## 2. Dry-Run Preview

- Click dry-run preview.
- Confirm that no browser automation starts during preview.
- Compare the preview against `expected-preview.json`.
- Point out grouping by `payToVendorNameEn`, mapped Korean supplier name, HS code, line items, and validation messages.

## 3. Human Gate

- Select the groups to draft.
- Check the operator confirmation box.
- Confirm the run summary: approved groups, source files, line-item count, skipped-row count, and target action `임시저장`.

## 4. Draft Creation

- Use manual Chrome login for the live portal demo.
- Drive only the approved draft-generation flow.
- Stop on unexpected portal state, missing totals, or any final-submission style prompt.
- The demo may show `임시저장` completion, but must not show or perform final `발급` or `제출`.

## 5. Report

- Show the batch report.
- Explain that the operator reviews and issues manually inside uTradeHub after automation stops.

## Reviewer Notes

This demo is meant to communicate the engineering boundary and user workflow. It is not a public live-site test harness. Reviewers without uTradeHub access can still understand the local app, dry-run preview, human gate, and temporary-draft boundary from the redacted assets.
