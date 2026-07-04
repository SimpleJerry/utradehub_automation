# UTradeHub Automation

This repository contains a local draft-generation tool for Korean `구매확인서` work:

`purchase-order PDFs -> structured extraction -> English vendor/HS mapping -> supplier grouping -> operator preview approval -> uTradeHub 임시저장 drafts`

**Hard boundary: the human gate.** The tool may create `임시저장` drafts only. It must never automatically click final `발급`, `제출`, or any equivalent issuance/submission action. Final review and issuance must be performed manually by the operator inside uTradeHub.

## Languages

- 中文: [README.md](./README.md)
- English: this file
- 한국어: [README.ko.md](./README.ko.md)

The three README files should describe the same facts. When a feature, script, boundary, or operating flow changes, update all three README files together.

## Current Shape

- Version line: the `2.x` TypeScript rewrite in `package.json`.
- Backend: local Fastify HTTP API.
- Frontend: React 19 + Vite operator UI.
- Browser automation: `playwright-core` drives the operator's installed Google Chrome via `channel: "chrome"`; Chromium is not bundled.
- PDF text extraction: `unpdf`.
- LLM extraction: Vercel AI SDK + OpenAI-compatible provider, validated with Zod schemas.
- Quality gate: `npm run verify`, which runs `typecheck + lint + format:check + test`.
- Packaging: `packaging/package.mjs` builds the frontend and backend bundle, copies the current Node runtime plus production dependencies, then optionally runs Inno Setup for a per-user Windows installer.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) and [openspec/](./openspec/) for architecture and specification history.

## Scope

Supported workflow:

1. The operator selects a supplier mapping CSV, enters the LLM API key for this run, and selects one or more purchase-order PDFs in the local UI.
2. `/api/preview` performs a dry run: PDF text extraction, structured LLM extraction, supplier mapping, supplier grouping, and pre-submission validation.
3. The supplier field extracted by the LLM is `payToVendorNameEn` (English Pay-to Vendor name). The CSV maps that English name to `supplierNameKo` and `hsCode`.
4. The frontend shows the fields and line items each supplier group would submit, missing fields, line items that the submission plan would drop, and PDF/LLM extraction failures.
5. The operator approves only the supplier groups to process and selects the login mode.
6. `/api/run` calls the browser driver only for approved groups, creates `임시저장` drafts one group at a time, and returns a result report.

The tool explicitly does not:

- Persist LLM API keys, uTradeHub usernames/passwords, or session credentials.
- Commit private supplier mappings.
- Access the network or launch a real browser during default verification.
- Replace human judgment for HS codes, portal field semantics, real issuance, or release approval.

## Layout

```text
utradehub_automation/
├─ src/
│  ├─ core/        # pure domain logic: models, line items, CSV, mapping, grouping, validation, submission plans
│  ├─ ports/       # external dependency interfaces: PDF text, LLM, Extractor, BrowserDriver
│  ├─ adapters/    # unpdf, OpenAI-compatible LLM, Playwright, site contract/drift, CSV loader
│  └─ app/         # DTOs, orchestration, diagnostics, environment checks, Fastify server
├─ web/            # React/Vite operator UI: config, preview, human approval, run, report
├─ test/           # Vitest backend/core tests and fixtures
├─ web/src/        # frontend components and *.test.tsx
├─ examples/       # committable templates such as vendor_mapping.example.csv
├─ docs/           # architecture notes and design records
├─ openspec/       # specs, change proposals, and archived history
├─ packaging/      # Windows packaging script and Inno Setup config
├─ scripts/        # maintenance scripts such as Ruler asset sync
└─ .ruler/         # single source for AGENTS.md, skills, and subagents
```

`.ruler/AGENTS.md` is the single source of truth for agent startup instructions. Root `AGENTS.md` is no longer tracked; do not hand-write or commit it. `npm run agents:sync` regenerates root `AGENTS.md` from `.ruler/AGENTS.md` and refreshes local platform outputs such as `CLAUDE.md`, `.claude/`, `.codex/`, and `.agents/skills/`. Root `AGENTS.md` is ignored by `.gitignore` and is no longer a committed truth source.

## Supplier Mapping CSV

The UI requires a CSV with these fixed columns:

```csv
vendor_name_en,supplier_name_ko,hs_code
Skin Medience,스킨메디언스,3916909000
```

`vendor_name_en` corresponds to the extracted `payToVendorNameEn`. See [examples/vendor_mapping.example.csv](./examples/vendor_mapping.example.csv). Copy the template for local use, but do not commit private supplier, HS-code, or customer data.

## Operator Run

The intended path for non-technical operators is the Windows installer:

1. Install `UTradeHubAutomationSetup.exe` per user; administrator rights are not required.
2. Open **UTradeHub Automation** from the desktop or Start menu.
3. The local service listens on `127.0.0.1:3000` and opens a browser automatically.
4. In the UI: choose the mapping CSV, enter the LLM API key, select PDFs, run preview, review manually, confirm, run, and review the report.
5. Login defaults to manual login in Chrome: the tool opens Chrome and waits for the operator to finish uTradeHub login. Automatic username/password login is optional for the current session only; credentials are not saved.
6. Review the `임시저장` drafts inside uTradeHub manually before deciding whether to perform final `발급`.

Prerequisites:

- Google Chrome is installed on the operator machine.
- The LLM API key and uTradeHub credentials are entered only for the current run.
- The supplier mapping CSV is ready.
- The UI provides a “check environment” action for blockers such as missing Chrome.

## Development

Requires Node.js >= 24 and npm.

```powershell
npm install
npm run dev
npm run verify
```

Common commands:

```powershell
npm run typecheck      # TypeScript strict check
npm run lint           # ESLint
npm run format:check   # Prettier check
npm run test           # Vitest
npm run coverage       # Vitest coverage
npm run fix            # eslint --fix + prettier write
npm run build          # Vite frontend build
npm run start          # Fastify server against built web/dist
```

`npm run verify` is the single health gate and the local equivalent of CI. Default verification must remain zero-network and zero-real-browser.

## Packaging

```powershell
npm run package
```

Packaging flow:

1. `npm run build` creates `web/dist`.
2. esbuild bundles `src/app/server/index.ts` as the Node ESM backend entry.
3. A temporary stage runs `npm ci --omit=dev --ignore-scripts` and copies production `node_modules`.
4. The current machine's `node.exe` is copied into `packaging/build/`.
5. `UTradeHubAutomation.cmd` is generated as the launcher.
6. If Inno Setup is available, the installer is written to `packaging/dist/`.

Without Inno Setup, use:

```powershell
node packaging/package.mjs --no-installer
```

The CI release workflow builds installers from version tags. Real publication, tags, and external release approval remain human-gated.

## Real Site Testing

The real uTradeHub integration test is skipped by default. It runs only when explicitly enabled with developer-local environment variables. The test reads the current process `process.env`; it does not automatically load `.env`:

```powershell
$env:SITE_E2E = "1"
$env:SITE_BASE_URL = "https://..."
$env:SITE_MANUAL_LOGIN = "1"  # manual login mode; otherwise SITE_USERNAME / SITE_PASSWORD are required
npm test
```

Without manual login mode:

```powershell
$env:SITE_E2E = "1"
$env:SITE_BASE_URL = "https://..."
$env:SITE_USERNAME = "..."
$env:SITE_PASSWORD = "..."
npm test
```

`.env` is only for developers who choose to manage gated test variables locally, and remains ignored. Real-site validation may only run to `임시저장`; it must not perform final issuance or submission automatically.

## Diagnostics and Sensitive Data

With `UTH_DIAG=1`, the app writes preview/run summaries under `.diagnostics/`; `UTH_DIAG_DIR` can point to another local directory. Playwright failure handling may also write screenshots or HTML captures. Diagnostics can contain account, supplier, or order context and must remain ignored.

Do not commit:

- `.env`
- private supplier mappings
- screenshots, HTML captures, traces, HAR files, or other portal diagnostics
- packaging outputs under `packaging/build/` or `packaging/dist/`
- local agent platform outputs and root `AGENTS.md`

## Agent/Ruler Maintenance

Ruler is the single source of truth for shared agent assets:

- Startup instructions: edit `.ruler/AGENTS.md`.
- Project skills: edit `.ruler/skills/`.
- Subagents: edit `.ruler/agents/`.
- Preview generated differences: `npm run agents:dry-run`.
- Refresh local platform outputs: `npm run agents:sync`.

Keep `.ruler/` as the only truth source. Root `AGENTS.md` may be generated locally by Ruler, but do not track it.