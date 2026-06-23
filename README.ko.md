# UTradeHub Automation

## Language / 语言 / 언어
- 中文（주 문서）：[README.md](./README.md)
- English: [README.en.md](./README.en.md)
- 한국어 (현재): [README.ko.md](./README.ko.md)

**구매주문 PDF → 필드 추출 → 매핑/정규화 → 공급사 기준 그룹화 → uTradeHub 사이트에서 구매확인서 임시저장 초안 생성**까지 수행하는 로컬 도구입니다.

**휴먼 게이트(하드 제약):** 본 도구는 **임시저장 초안**만 생성하며, 최종 발급/제출 버튼은 절대 누르지 않습니다. 최종 발급은 사람이 uTradeHub에서 검토한 뒤 수동으로 진행합니다. 자동 신고 도구가 아니라 *초안 생성기*입니다.

기술 형태: **TypeScript 풀스택 로컬 웹 앱**(Fastify 백엔드 + React/Vite UI)으로, **운영자 시스템의 Chrome**을 Playwright로 구동합니다(`channel:"chrome"`, Chromium 번들 없음). 배경은 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)와 `openspec/`(스펙 및 변경 이력)를 참고하세요.

## 1. 기능 범위

1. 여러 구매주문 PDF를 일괄 수집합니다.
2. LLM 기반(공급자 비종속, OpenAI 호환) 구조화 추출로 핵심 필드(`Blanket Purchase Order No.`, `Document Date`, `Pay-to Vendor No.`, 품목 행)를 뽑고 zod 스키마로 검증합니다.
3. 공급사/HS Code 매핑은 외부 CSV로 처리합니다.
4. `Pay-to Vendor No.` 기준 그룹화: `m개 PDF → n개 공급사 그룹`(보통 `m ≥ n`).
5. preflight 검증 후 **드라이런 미리보기**(각 그룹이 입력할 내용 + 검증 결과)를 표시합니다.
6. 사람이 확인한 뒤, 그룹별로 사이트에서 `login → open_form → fill_basic_info → select_supplier → fill_line_items → 임시저장`을 실행하고 결과 리포트를 출력합니다.
7. 자격증명은 **메모리 전용**: 세션마다 UI에서 입력하고 해당 실행의 메모리에만 보관하며, 디스크나 로그에 절대 기록하지 않습니다.

## 2. 디렉터리 구조

```text
utradehub_automation/
├─ src/
│  ├─ core/        # 순수 도메인 로직(모델/매핑/그룹화/검증/제출 계획), I/O 없음, 전부 단위 테스트
│  ├─ ports/       # 외부 의존성 인터페이스(LLM provider, 브라우저 드라이버, PDF 텍스트, Extractor)
│  ├─ adapters/    # ports 구현(LLM 추출, unpdf, Playwright 드라이버, 사이트 계약, 드리프트 감지)
│  └─ app/         # 조립 루트: DTO, 오케스트레이션, 환경 점검, Fastify 서버
├─ web/            # React + Vite 프런트엔드(설정 / 드라이런 미리보기 / 자격증명 + 실행 / 리포트)
├─ test/           # 단위 테스트 및 test/fixtures/ golden-file 픽스처
├─ examples/       # vendor_mapping.example.csv 등 템플릿
├─ docs/           # ARCHITECTURE.md
├─ openspec/       # 스펙(specs/)과 변경 이력(changes/archive/)
├─ .env.example
└─ run.bat         # 원클릭 실행(= npm run start)
```

## 3. 공급사 매핑 CSV (고정 컬럼)

UI에서 공급사 매핑용 CSV를 선택합니다. 컬럼명은 아래와 같이 고정입니다:

```csv
vendor_name_en,supplier_name_ko,hs_code
Skin Medience,스킨메디언스,3916909000
```

템플릿은 [`examples/vendor_mapping.example.csv`](./examples/vendor_mapping.example.csv)를 참고하세요. 이를 복사해 자신의 매핑 파일로 만들고, **실제 매핑 데이터는 저장소에 커밋하지 마세요.**

## 4. 실행 / 배포 (비기술 운영자용)

1. 1회 준비: `npm install && npm run build`.
2. `run.bat` 더블클릭(= `npm run start`) — 로컬 서비스를 시작하고 브라우저를 자동으로 엽니다.
3. UI에서: LLM 설정(선택)과 공급사 매핑 CSV 입력, PDF 선택 → "드라이런 미리보기" → 각 그룹 확인 → 이번 세션 로그인 아이디/비밀번호 입력(**메모리 전용, 저장 안 함**) → 확인 체크 → "확인 후 실행" → 결과 리포트 확인.
4. 도구는 임시저장 초안까지만 만듭니다. uTradeHub에서 검토한 뒤 사람이 최종 발급을 진행하세요.

**사전 조건:** 운영자 시스템에 Chrome 설치; LLM 설정(`.env`: `LLM_BASE_URL`/`LLM_MODEL`/`LLM_API_KEY`); 매핑 CSV 준비. 실행 전 UI / `checkEnvironment()`가 차단 항목을 요약합니다.

## 5. 개발

환경: Node ≥ 24, npm(개발 머신에 pnpm 미설치).

```powershell
npm install          # 의존성 설치
npm run dev          # 개발 모드: Vite 프런트엔드 + Fastify 백엔드 병렬
npm run verify       # typecheck + lint + format:check + test(유일한 헬스 게이트)
npm test             # 테스트만 실행
npm run format       # Prettier 자동 포맷
```

규약(`docs/ARCHITECTURE.md` 참고):
- functional-core / imperative-shell 계층화; 모든 외부 의존성(LLM, 브라우저, 파일시스템, 시계)은 ports를 통해서만 접근하여 코어를 I/O 없이 단위 테스트합니다.
- 자격증명/시크릿은 절대 커밋하지 않으며, 시크릿이 없는 `.env.example`만 체크인합니다.
- golden-file 픽스처로 결정적 테스트를 구동합니다.

CI(`.github/workflows/ci.yml`)는 모든 push/PR에서 `npm run verify`를 실행합니다. "실패 시 머지 차단"은 GitHub 저장소 설정에서 브랜치 보호를 직접 활성화해야 합니다.

## 6. 사이트 통합 테스트 (gated)

실제 uTradeHub 사이트를 초안까지 구동하는 통합 테스트는 기본적으로 건너뛰며, 명시적으로 활성화할 때만 실행됩니다:

```powershell
$env:SITE_E2E = "1"   # 추가로 .env의 SITE_BASE_URL / SITE_USERNAME / SITE_PASSWORD(개발 머신 전용, 절대 커밋 금지)
npm test
```

기본 `npm run verify`는 브라우저 0, 네트워크 0입니다.
