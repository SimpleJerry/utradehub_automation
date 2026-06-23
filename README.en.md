# UTradeHub Automation

## Language / 语言 / 언어
- 中文（Main）：[README.md](./README.md)
- English (current): [README.en.md](./README.en.md)
- 한국어: [README.ko.md](./README.ko.md)

A local tool that turns **purchase-order PDFs → extracted fields → mapping/cleanup → grouping by supplier → a 구매확인서 임시저장 (temporary-save) draft driven on the uTradeHub website**.

**Human gate (hard rule):** the tool only creates **임시저장 drafts** — it never clicks the final 발급/제출. Final issuance is done manually by a person after reviewing on uTradeHub. It is a *draft generator*, not an autonomous filer.

Stack: a **TypeScript full-stack local web app** (Fastify backend + React/Vite UI), driving the operator's **system Chrome** with Playwright (`channel:"chrome"`, no bundled Chromium). See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) and `openspec/` (specs and change history) for background.

## 1. Scope

1. Batch-ingest multiple purchase-order PDFs.
2. LLM-based structured extraction (vendor-agnostic, OpenAI-compatible) of core fields: `Blanket Purchase Order No.`, `Document Date`, `Pay-to Vendor No.`, line items — validated by a zod schema.
3. Supplier and HS-Code mapping via an external CSV.
4. Group by `Pay-to Vendor No.`: `m PDFs → n supplier groups` (typically `m ≥ n`).
5. After preflight validation, show a **dry-run preview** (what each group will fill + validation results).
6. After human confirmation, drive each group on the site through `login → open_form → fill_basic_info → select_supplier → fill_line_items → 임시저장`, then output a result report.
7. Credentials are **in-memory only**: entered per session in the UI, held only in memory for that run, never written to disk or logs.

## 2. Layout

```text
utradehub_automation/
├─ src/
│  ├─ core/        # pure domain logic (model/mapping/grouping/validation/submission-plan), no I/O, fully unit-tested
│  ├─ ports/       # interfaces for external deps (LLM provider, browser driver, PDF-to-text, Extractor)
│  ├─ adapters/    # port implementations (LLM extraction, unpdf, Playwright driver, site contract, drift detection)
│  └─ app/         # composition root: DTOs, orchestration, environment check, Fastify server
├─ web/            # React + Vite frontend (config / dry-run preview / credentials + run / report)
├─ test/           # unit tests and test/fixtures/ golden-file fixtures
├─ examples/       # vendor_mapping.example.csv and other templates
├─ docs/           # ARCHITECTURE.md
├─ openspec/       # specs (specs/) and change history (changes/archive/)
├─ .env.example
└─ run.bat         # one-click launch (= npm run start)
```

## 3. Supplier mapping CSV (fixed columns)

Pick a CSV in the UI as the supplier mapping. Column names must be exactly:

```csv
vendor_name_en,supplier_name_ko,hs_code
Skin Medience,스킨메디언스,3916909000
```

See the template at [`examples/vendor_mapping.example.csv`](./examples/vendor_mapping.example.csv); copy it into your own mapping file and **never commit private mapping data**.

## 4. Run / delivery (for a non-technical operator)

1. One-time setup: `npm install && npm run build`.
2. Double-click `run.bat` (equivalent to `npm run start`) — it starts the local service and opens the browser.
3. In the UI: provide the LLM config (optional) and the supplier-mapping CSV, select PDFs → "dry-run preview" → review each group → enter this session's login id/password (**memory only, not saved**) → tick to confirm → "confirm and run" → see the result report.
4. The tool only reaches 임시저장 drafts; review on uTradeHub and have a person do the final 발급.

**Prerequisites:** Chrome installed on the operator's system; LLM configured (`.env`: `LLM_BASE_URL`/`LLM_MODEL`/`LLM_API_KEY`); mapping CSV ready. The UI / `checkEnvironment()` summarizes blockers before a run.

## 5. Development

Environment: Node ≥ 24, npm (pnpm not installed on the dev machine).

```powershell
npm install          # install deps
npm run dev          # dev mode: Vite frontend + Fastify backend in parallel
npm run verify       # typecheck + lint + format:check + test (the single health gate)
npm test             # tests only
npm run format       # auto-format with Prettier
```

Conventions (see `docs/ARCHITECTURE.md`):
- functional-core / imperative-shell layering; all external deps (LLM, browser, filesystem, clock) accessed only through ports, so the core is unit-tested with zero I/O.
- Credentials/secrets are never committed; only a secret-free `.env.example` is checked in.
- golden-file fixtures drive deterministic tests.

CI (`.github/workflows/ci.yml`) runs `npm run verify` on every push/PR. "Block merge on failure" requires enabling branch protection in the GitHub repo settings.

## 6. Site integration test (gated)

The integration test that drives the real uTradeHub site to a draft is skipped by default and runs only when explicitly enabled:

```powershell
$env:SITE_E2E = "1"   # plus .env's SITE_BASE_URL / SITE_USERNAME / SITE_PASSWORD (dev machine only, never committed)
npm test
```

By default `npm run verify` is zero-browser, zero-network.
