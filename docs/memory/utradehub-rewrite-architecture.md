# uTradeHub Rewrite Architecture Memory

## Product Boundary

uTradeHub Automation is a local draft-generation tool for Korean `구매확인서` work:
`purchase-order PDFs -> structured extraction -> vendor/HS mapping -> supplier grouping -> operator preview -> uTradeHub 임시저장 drafts`.

The hard safety boundary is the human gate. The tool may create `임시저장` drafts only. It must never automatically click final `발급`, `제출`, or equivalent issuance/submission actions. Final review and issuance happen manually inside uTradeHub.

Credentials and secrets are memory-only per session. LLM API keys and uTradeHub login credentials are entered by the operator for the current run, held only in process memory, and must not be persisted, logged, or committed. `.env` is only for developer-gated tests and remains ignored.

## Architecture

The rewrite uses functional-core / imperative-shell:

- `src/core/` contains pure domain logic: typed order models, line-item normalization, vendor mapping, grouping, validation, and submission-plan construction. It has no I/O, browser, network, filesystem, clock, or environment reads.
- `src/ports/` defines interfaces for external dependencies such as PDF text extraction, LLM extraction, and browser driving.
- `src/adapters/` implements ports: `unpdf` PDF text extraction, OpenAI-compatible LLM extraction, Playwright site automation, site contract/drift checks, and CSV/vendor mapping loading.
- `src/app/` composes the workflow, DTOs, environment checks, and Fastify server.
- `web/` provides the React/Vite operator UI for config, dry-run preview, human confirmation, run, and report stages.

All side effects stay in adapters/app layers. Core behavior should be covered by deterministic unit tests and fixtures before any real browser or network path is involved.

## Technology Stack

- Runtime: Node.js >= 24, TypeScript ESM.
- Backend: Fastify.
- Frontend: React 19 with Vite.
- Browser automation: `playwright-core` driving the operator's installed Chrome via `channel: "chrome"`; Chromium is not bundled.
- PDF extraction: `unpdf`.
- LLM integration: Vercel AI SDK with OpenAI-compatible providers, validated through Zod schemas.
- Validation/types: Zod plus TypeScript strict checks.
- Tests and quality gate: Vitest, Testing Library, ESLint, Prettier. The single health command is `npm run verify` (`typecheck + lint + format:check + test`).
- Packaging: `packaging/` uses esbuild/Node packaging and Inno Setup for a per-user Windows installer; CI release packaging runs from version tags.

## Workflow Invariants

- Default verification must be zero-network and zero-browser. Real uTradeHub integration is gated behind explicit environment flags and developer credentials.
- Site automation stops at `임시저장` and returns structured `SaveResult`/errors with step context.
- PDF/LLM extraction failures must be surfaced to the operator and tests; do not silently coerce missing data.
- Supplier mapping is operator-supplied CSV data. Private mappings are not committed; only examples/templates are tracked.
- Any cross-layer field addition must keep `src/core/model.ts`, DTOs, UI preview/report, extractor schemas, and site automation in sync.
- Keep generated diagnostics, screenshots, HTML captures, private mappings, credentials, and worktrees out of Git.

## Agent Team

Use the project agent split for larger changes:

- `playwright-reliability`: `src/adapters/playwright-driver.ts`, `site-contract.ts`, selector/line-item reliability, race removal.
- `extraction-eval`: PDF text, LLM extraction, model schemas, fixtures, and field-level accuracy.
- `web-ux`: operator UI and human gate UX in `web/src`.
- `release-packager`: Windows packaging and GitHub release workflow.
- `qa-verify`: independent read-only verification, shape checks, and `npm run verify`.

The human remains the steward for live Korean portal behavior, HS-code/domain judgment, and any real issuance/release decision.
