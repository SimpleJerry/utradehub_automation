# UTradeHub Automation

이 저장소는 한국 `구매확인서` 업무를 위한 로컬 초안 생성 도구입니다:

`구매주문 PDF -> 구조화 추출 -> 영문 공급사/HS 매핑 -> 공급사별 그룹화 -> 운영자 미리보기 승인 -> uTradeHub 임시저장 초안`

**하드 경계: 휴먼 게이트.** 도구는 `임시저장` 초안만 만들 수 있습니다. 최종 `발급`, `제출` 또는 동등한 발급/제출 동작을 자동으로 클릭해서는 안 됩니다. 최종 검토와 발급은 운영자가 uTradeHub 안에서 수동으로 수행해야 합니다.

## 언어

- 中文: [README.md](./README.md)
- English: [README.en.md](./README.en.md)
- 한국어: 이 파일

세 README는 같은 사실을 설명해야 합니다. 기능, 스크립트, 경계, 운영 흐름이 바뀌면 세 파일을 함께 갱신하세요.

## 현재 형태

- 버전 라인: `package.json`의 `2.x` TypeScript 재작성 라인.
- 백엔드: 로컬 Fastify HTTP API.
- 프런트엔드: React 19 + Vite 운영자 UI.
- 브라우저 자동화: `playwright-core`가 운영자 PC에 설치된 Google Chrome을 `channel: "chrome"`으로 구동합니다. Chromium은 번들하지 않습니다.
- PDF 텍스트 추출: `unpdf`.
- LLM 추출: Vercel AI SDK + OpenAI-compatible provider, Zod schema 검증.
- 품질 게이트: `npm run verify` (`typecheck + lint + format:check + test`).
- 패키징: `packaging/package.mjs`가 프런트엔드와 백엔드 번들을 만들고, 현재 Node 런타임과 프로덕션 의존성을 복사한 뒤, 선택적으로 Inno Setup으로 per-user Windows 설치 패키지를 만듭니다.

아키텍처와 스펙 이력은 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) 및 [openspec/](./openspec/)를 참고하세요.

## 범위

지원하는 워크플로:

1. 운영자가 로컬 UI에서 공급사 매핑 CSV를 선택하고, 이번 실행의 LLM API Key를 입력하며, 하나 이상의 구매주문 PDF를 선택합니다.
2. `/api/preview`는 드라이런을 수행합니다: PDF 텍스트 추출, LLM 구조화 추출, 공급사 매핑, 공급사 그룹화, 제출 전 검증.
3. LLM이 추출하는 공급사 필드는 `payToVendorNameEn`(영문 Pay-to Vendor 이름)입니다. CSV는 이 영문 이름을 `supplierNameKo`와 `hsCode`로 매핑합니다.
4. 프런트엔드는 각 공급사 그룹이 제출할 필드와 품목 행, 누락 필드, 제출 계획에서 제외될 품목 행, PDF/LLM 추출 실패를 보여줍니다.
5. 운영자는 처리할 공급사 그룹만 승인하고 로그인 방식을 선택합니다.
6. `/api/run`은 승인된 그룹에 대해서만 브라우저 드라이버를 호출하고, 그룹별로 `임시저장` 초안을 만든 뒤 결과 리포트를 반환합니다.

도구가 명시적으로 하지 않는 일:

- LLM API Key, uTradeHub 계정/비밀번호, 세션 자격증명을 저장하지 않습니다.
- 비공개 공급사 매핑을 커밋하지 않습니다.
- 기본 검증에서 네트워크에 접근하거나 실제 브라우저를 실행하지 않습니다.
- HS code, 포털 필드 의미, 실제 발급, 릴리스 승인에 대한 사람의 판단을 대체하지 않습니다.

## 디렉터리 구조

```text
utradehub_automation/
├─ src/
│  ├─ core/        # 순수 도메인 로직: 모델, 품목 행, CSV, 매핑, 그룹화, 검증, 제출 계획
│  ├─ ports/       # 외부 의존성 인터페이스: PDF text, LLM, Extractor, BrowserDriver
│  ├─ adapters/    # unpdf, OpenAI-compatible LLM, Playwright, 사이트 계약/드리프트, CSV loader
│  └─ app/         # DTO, 오케스트레이션, 진단, 환경 점검, Fastify server
├─ web/            # React/Vite 운영자 UI: 설정, 미리보기, 휴먼 승인, 실행, 리포트
├─ test/           # Vitest 백엔드/코어 테스트와 fixtures
├─ web/src/        # 프런트엔드 컴포넌트와 *.test.tsx
├─ examples/       # vendor_mapping.example.csv 같은 커밋 가능한 템플릿
├─ docs/           # 아키텍처 설명과 설계 기록
├─ openspec/       # 스펙, 변경 제안, 아카이브 이력
├─ packaging/      # Windows 패키징 스크립트와 Inno Setup 설정
├─ scripts/        # Ruler asset sync 같은 유지보수 스크립트
└─ .ruler/         # AGENTS.md, skills, subagents의 단일 소스
```

`.ruler/AGENTS.md`가 agent 시작 지침의 단일 진실 소스입니다. 루트 `AGENTS.md`는 더 이상 추적하지 않으며, 직접 작성하거나 커밋하지 마세요. `npm run agents:sync`는 `.ruler/AGENTS.md`에서 루트 `AGENTS.md`를 다시 생성하고 `CLAUDE.md`, `.claude/`, `.codex/`, `.agents/skills/` 같은 로컬 플랫폼 출력을 갱신합니다. 루트 `AGENTS.md`는 `.gitignore`에 의해 무시되며 더 이상 커밋되는 진실 소스가 아닙니다.

## 공급사 매핑 CSV

UI에는 아래 고정 컬럼을 가진 CSV가 필요합니다:

```csv
vendor_name_en,supplier_name_ko,hs_code
Skin Medience,스킨메디언스,3916909000
```

`vendor_name_en`은 추출된 `payToVendorNameEn`에 대응합니다. 템플릿은 [examples/vendor_mapping.example.csv](./examples/vendor_mapping.example.csv)를 참고하세요. 로컬 사용을 위해 템플릿을 복사하되, 비공개 공급사, HS code, 고객 데이터는 커밋하지 마세요.

## 운영자 실행

비기술 운영자를 위한 목표 경로는 Windows 설치 패키지입니다:

1. `UTradeHubAutomationSetup.exe`를 per-user로 설치합니다. 관리자 권한은 필요하지 않습니다.
2. 바탕화면 또는 시작 메뉴에서 **UTradeHub Automation**을 엽니다.
3. 로컬 서비스가 `127.0.0.1:3000`에서 수신하고 브라우저를 자동으로 엽니다.
4. UI에서 매핑 CSV 선택, LLM API Key 입력, PDF 선택, 미리보기, 수동 검토, 확인, 실행, 리포트 확인을 진행합니다.
5. 로그인 기본값은 Chrome 수동 로그인입니다. 도구가 Chrome을 열고 운영자가 uTradeHub 로그인을 마칠 때까지 기다립니다. 자동 계정/비밀번호 로그인은 이번 세션에 한해 선택할 수 있으며 자격증명은 저장하지 않습니다.
6. 최종 `발급` 여부를 결정하기 전에 uTradeHub 안에서 `임시저장` 초안을 수동 검토하세요.

사전 조건:

- 운영자 PC에 Google Chrome이 설치되어 있습니다.
- LLM API Key와 uTradeHub 자격증명은 현재 실행에만 입력합니다.
- 공급사 매핑 CSV가 준비되어 있습니다.
- UI는 Chrome 누락 같은 차단 항목을 확인하는 “환경 점검” 동작을 제공합니다.

## 개발

Node.js >= 24와 npm이 필요합니다.

```powershell
npm install
npm run dev
npm run verify
```

자주 쓰는 명령:

```powershell
npm run typecheck      # TypeScript strict check
npm run lint           # ESLint
npm run format:check   # Prettier check
npm run test           # Vitest
npm run coverage       # Vitest coverage
npm run fix            # eslint --fix + prettier write
npm run build          # Vite frontend build
npm run start          # built web/dist를 사용하는 Fastify server
```

`npm run verify`가 단일 헬스 게이트이며 CI의 로컬 등가 명령입니다. 기본 검증은 네트워크 0, 실제 브라우저 0을 유지해야 합니다.

## 패키징

```powershell
npm run package
```

패키징 흐름:

1. `npm run build`가 `web/dist`를 만듭니다.
2. esbuild가 `src/app/server/index.ts`를 Node ESM 백엔드 엔트리로 번들합니다.
3. 임시 stage에서 `npm ci --omit=dev --ignore-scripts`를 실행하고 프로덕션 `node_modules`를 복사합니다.
4. 현재 머신의 `node.exe`를 `packaging/build/`로 복사합니다.
5. launcher인 `UTradeHubAutomation.cmd`를 생성합니다.
6. Inno Setup을 사용할 수 있으면 설치 패키지를 `packaging/dist/`에 씁니다.

Inno Setup 없이 빌드하려면:

```powershell
node packaging/package.mjs --no-installer
```

CI release workflow는 버전 태그에서 설치 패키지를 빌드합니다. 실제 게시, 태그, 외부 릴리스 승인은 계속 휴먼 게이트입니다.

## 실제 사이트 테스트

실제 uTradeHub 통합 테스트는 기본적으로 건너뜁니다. 개발자 로컬 환경 변수를 명시적으로 제공할 때만 실행됩니다. 테스트는 현재 프로세스의 `process.env`를 읽으며 `.env`를 자동 로드하지 않습니다:

```powershell
$env:SITE_E2E = "1"
$env:SITE_BASE_URL = "https://..."
$env:SITE_MANUAL_LOGIN = "1"  # 수동 로그인 모드; 아니면 SITE_USERNAME / SITE_PASSWORD 필요
npm test
```

수동 로그인 모드를 쓰지 않는 경우:

```powershell
$env:SITE_E2E = "1"
$env:SITE_BASE_URL = "https://..."
$env:SITE_USERNAME = "..."
$env:SITE_PASSWORD = "..."
npm test
```

`.env`는 개발자가 gated 테스트 변수를 로컬에서 관리할 때만 쓰며 ignored 상태를 유지합니다. 실제 사이트 검증은 `임시저장`까지만 가능하며 최종 발급이나 제출을 자동으로 수행하면 안 됩니다.

## 진단 및 민감 데이터

`UTH_DIAG=1`이면 앱이 미리보기/실행 요약을 `.diagnostics/`에 씁니다. `UTH_DIAG_DIR`로 다른 로컬 디렉터리를 지정할 수도 있습니다. Playwright 실패 처리도 스크린샷이나 HTML 캡처를 쓸 수 있습니다. 진단 산출물에는 계정, 공급사, 주문 맥락이 포함될 수 있으므로 ignored 상태를 유지해야 합니다.

커밋하지 말아야 할 것:

- `.env`
- 비공개 공급사 매핑
- 스크린샷, HTML 캡처, trace, HAR 또는 기타 포털 진단
- `packaging/build/`, `packaging/dist/` 아래 패키징 산출물
- 로컬 agent 플랫폼 출력과 루트 `AGENTS.md`

## Agent/Ruler 유지보수

Ruler가 공유 agent asset의 단일 진실 소스입니다:

- 시작 지침: `.ruler/AGENTS.md` 편집.
- 프로젝트 skills: `.ruler/skills/` 편집.
- subagents: `.ruler/agents/` 편집.
- 생성 차이 미리보기: `npm run agents:dry-run`.
- 로컬 플랫폼 출력 갱신: `npm run agents:sync`.

`.ruler/`를 유일한 진실 소스로 유지하세요. 루트 `AGENTS.md`는 Ruler가 로컬에서 생성할 수 있지만 추적하지 마세요.