# uTradeHub Automation Agent Instructions
## Project Boundary
uTradeHub Automation is a local draft-generation tool for Korean `구매확인서` work:
`purchase-order PDFs -> structured extraction -> vendor/HS mapping -> supplier grouping -> operator preview -> uTradeHub 임시저장 drafts`.
The hard safety boundary is the human gate. The tool may create `임시저장` drafts only. It must never automatically click final `발급`, `제출`, or equivalent issuance/submission actions. Final review and issuance happen manually inside uTradeHub.
Credentials and secrets are memory-only per session. LLM API keys and uTradeHub login credentials are entered by the operator for the current run, held only in process memory, and must not be persisted, logged, or committed. `.env` is only for developer-gated tests and remains ignored.
## Documentation Governance
Treat README drift as a release-blocking product risk because this project is operator-facing and safety-boundary-heavy.
- `README.md`, `README.en.md`, and `README.ko.md` must stay aligned. Do not update one language while leaving the others stale unless the user explicitly requests a partial translation pass.
- Keep README facts aligned with `package.json`, `src/core/model.ts`, `src/core/grouping.ts`, `src/app/server/*`, `src/app/orchestrator.ts`, `src/app/dto.ts`, `src/adapters/site-credentials.ts`, `packaging/package.mjs`, `.gitignore`, and `docs/ARCHITECTURE.md`.
- README must clearly state the human gate, memory-only credentials, ignored diagnostics/private mappings, zero-network/zero-browser default verification, and the Ruler-only source model for agent files.
- README must describe supplier grouping/mapping by `payToVendorNameEn` (English Pay-to Vendor name), not an obsolete vendor-number field.
- README must describe the default site-login path as manual login in Chrome, with automatic username/password login as an optional per-session mode.
- Do not imply `.env` is automatically loaded by tests. Gated site tests read `SITE_*` values from the current process environment unless a developer adds their own loader.
- Do not document live-site or release behavior as automatic. Real uTradeHub validation, HS-code/domain judgment, formal issuance, tags, and public releases remain human decisions.
## Architecture
Use functional-core / imperative-shell:
- `src/core/` contains pure domain logic: typed order models, line-item normalization, vendor mapping, grouping, validation, and submission-plan construction. It has no I/O, browser, network, filesystem, clock, or environment reads.
- `src/ports/` defines interfaces for external dependencies such as PDF text extraction, LLM extraction, and browser driving.
- `src/adapters/` implements ports: `unpdf` PDF text extraction, OpenAI-compatible LLM extraction, Playwright site automation, site contract/drift checks, and CSV/vendor mapping loading.
- `src/app/` composes DTOs, diagnostics, environment checks, batch orchestration, and the Fastify server. `/api/preview` is dry-run only; `/api/run` only processes operator-approved supplier groups.
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
- Packaging: `packaging/package.mjs` builds the Vite frontend, bundles the Node backend with esbuild, copies the current Node runtime plus production dependencies, and optionally runs Inno Setup for a per-user Windows installer; CI release packaging runs from version tags.
## Workflow Invariants
- Default verification must be zero-network and zero-browser. Real uTradeHub integration is gated behind explicit environment flags and developer credentials.
- Site automation stops at `임시저장` and returns structured `SaveResult`/errors with step context.
- Production credentials are passed in memory from the UI. `src/adapters/site-credentials.ts` is for gated developer integration tests only.
- PDF/LLM extraction failures must be surfaced to the operator and tests; do not silently coerce missing data.
- Supplier mapping is operator-supplied CSV data keyed by English vendor name. Private mappings are not committed; only examples/templates are tracked.
- Any cross-layer field addition must keep `src/core/model.ts`, DTOs, UI preview/report, extractor schemas, and site automation in sync.
- Keep generated diagnostics, screenshots, HTML captures, traces/HAR, private mappings, credentials, packaging outputs, `_workspace/`, root `AGENTS.md`, and worktrees out of Git.
## Agent Team
For uTradeHub/구매확인서/关务自动化 development work, use the `utradehub-orchestrator` skill to route work across the specialist team:
- `playwright-reliability`: `src/adapters/playwright-driver.ts`, `site-contract.ts`, selector/line-item reliability, race removal.
- `extraction-eval`: PDF text, LLM extraction, model schemas, fixtures, and field-level accuracy.
- `web-ux`: operator UI and human gate UX in `web/src`.
- `release-packager`: Windows packaging and GitHub release workflow.
- `qa-verify`: independent read-only verification, shape checks, and `npm run verify`.
The human remains the steward for live Korean portal behavior, HS-code/domain judgment, and any real issuance/release decision.
## Agent Asset Maintenance
Ruler is the single source of truth for shared agent assets:
- Edit startup instructions in `.ruler/AGENTS.md`.
- Edit project skills in `.ruler/skills/`.
- Edit subagents in `.ruler/agents/`.
- Run `npm run agents:sync` after changing any `.ruler/` agent asset.
- Use `npm run agents:dry-run` to preview generated changes.
Root `AGENTS.md` is intentionally ignored and not tracked. Do not edit or commit it. `npm run agents:sync` regenerates ignored root `AGENTS.md` from `.ruler/AGENTS.md` and refreshes platform-specific local outputs such as `CLAUDE.md`, `.claude/`, `.codex/`, and `.agents/skills/`. `.ruler/AGENTS.md` remains the only committed truth source.