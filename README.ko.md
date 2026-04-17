# UTradeHub Automation

## Language / 语言 / 언어
- 中文（주 문서）：[README.md](./README.md)
- English: [README.en.md](./README.en.md)
- 한국어 (현재): [README.ko.md](./README.ko.md)

이 프로젝트는 “PDF 일괄 읽기 -> 필드 추출 -> 매핑/정규화 -> 웹 폼 자동 입력” 자동화를 위한 저장소입니다.

현재 저장소 상태(실행 가능):
- PDF 파싱 및 핵심 필드 추출이 구현되어 있습니다.
- 공급사/HS Code 매핑은 외부 CSV로 분리되어 있습니다.
- `Pay-to Vendor No.` 기준으로 그룹화한 뒤 그룹당 1회 웹 저장을 수행합니다.
- GUI 데스크톱 진입점, 로그, 배치 결과 출력이 연결되어 있습니다.

## 1. 기능 범위 (현재 버전)

1. `input_pdfs` 디렉터리의 여러 PDF를 순회 처리합니다.
2. 핵심 필드(`Blanket Purchase Order No.`, `Document Date`, `Pay-to Vendor No.`, 품목 행)를 추출합니다.
3. preflight 검증 후 공급사 기준 그룹 처리: `m개 PDF -> n개 공급사 그룹 -> n회 웹 저장`(보통 `m >= n`).
4. 웹 동작 메인 체인: `login -> open_form -> fill_basic_info -> select_supplier -> fill_order_from_pdf -> save`.
5. 중간 산출물, 요약 CSV/JSONL, 실행 로그를 출력합니다.

## 2. 디렉터리 구조

```text
utradehub_automation/
├─ app/
│  ├─ config.py
│  ├─ models.py
│  ├─ pdf_reader.py
│  ├─ vendor_mapping_loader.py
│  ├─ field_mapper.py
│  ├─ site_bot.py
│  ├─ workflow.py
│  └─ __init__.py
├─ desktop/                  # GUI 관련 모듈
├─ data/
│  ├─ input_pdfs/            # PDF 입력 디렉터리
│  ├─ extracted/             # 중간/요약 출력
│  └─ local/                 # 로컬 매핑 파일
├─ packaging/                # 패키징/설치 스크립트
├─ resources/                # 아이콘 및 리소스
├─ launcher_gui.py           # GUI 실행 진입점(개발 환경)
├─ main.py                   # CLI 실행 진입점(개발/디버깅)
├─ README_USER.md            # 최종 사용자 안내서
├─ .env.example
└─ config.user.example.json
```

## 3. 모듈 역할

1. `app/pdf_reader.py`
- PDF 텍스트를 파싱하고 메타데이터/품목 행을 추출합니다.

2. `app/field_mapper.py`
- `RawPdfData`를 `FormRecord`로 매핑합니다.
- 외부 CSV를 통해 공급사(한글명)와 HS Code를 매핑합니다.
- 통합 preflight 검증을 수행합니다(`source_file/supplier_name/hs_code/line_items`).

3. `app/workflow.py`
- PDF 배치 처리.
- 공급사 기준 그룹화 및 그룹 레코드 생성.
- 그룹당 1회 웹 저장 실행 및 결과 기록.

4. `app/site_bot.py`
- 공급사 선택, 품목 행 입력을 포함한 웹 동작을 캡슐화합니다.

5. `desktop/*`
- GUI 설정 저장/로딩, 실행 전 검증, 로그 표시, 배치 실행 트리거를 담당합니다.

## 4. 데이터 흐름

```text
PDF -> pdf_reader -> RawPdfData
RawPdfData -> field_mapper(+vendor mapping CSV) -> FormRecord
FormRecord -> validate_record(preflight) -> valid/invalid
valid records -> group by Pay-to Vendor No.
grouped records -> site_bot.save_record -> SaveResult
SaveResult -> workflow -> batch_results.csv/jsonl + logs
```

## 5. 공급사 매핑 CSV (고정 컬럼)

- `VENDOR_MAPPING_PATH`로 CSV 경로를 지정합니다.
- 미지정 시 기본값: `data/local/vendor_mapping.csv`
- 템플릿: `data/local/vendor_mapping.example.csv`

CSV 컬럼은 아래와 같이 고정입니다:

```csv
vendor_name_en,supplier_name_ko,hs_code
Skin Medience,스킨메디언스,3916909000
```

## 6. 개발 환경 실행 (CLI / GUI)

1. 의존성 설치

```powershell
cd F:\utradehub_automation
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m playwright install chromium
```

2. `.env` 설정 (CLI 디버깅용)

```powershell
copy .env.example .env
```

3. GUI 실행 (권장)

```powershell
.\.venv\Scripts\python.exe launcher_gui.py
```

4. CLI 실행 (개발/디버깅)

```powershell
.\.venv\Scripts\python.exe main.py
```

## 7. 데스크톱 패키징 및 배포

1. 데스크톱 산출물 빌드

```powershell
cd F:\utradehub_automation
.\packaging\build.ps1 -Clean
```

2. `packaging/output/UTradeHubDesktop`에 아래가 포함되어 있는지 확인:
- `UTradeHubDesktop.exe`
- `README_USER.md`
- `config.user.json.example`
- `data/local/vendor_mapping.example.csv`
- `playwright-browsers/chromium-*`

3. Inno Setup에서 `packaging/installer.iss`를 열어 컴파일합니다.
4. `UTradeHubAutomationSetup.exe`와 `README_USER.md`를 함께 전달합니다.

## 8. GUI 런타임 경로 (중요)

- 런타임 설정 파일: `%LOCALAPPDATA%\UTradeHubAutomation\config.user.json`
- 기본 입력 디렉터리: `%LOCALAPPDATA%\UTradeHubAutomation\data\input_pdfs`
- 기본 출력 디렉터리: `%LOCALAPPDATA%\UTradeHubAutomation\data\extracted`
- 실행 로그 디렉터리: `%LOCALAPPDATA%\UTradeHubAutomation\logs`

참고:
- 설치 패키지에는 템플릿 `config.user.json.example`만 포함됩니다.
- GUI 첫 실행 시 런타임 설정 파일이 자동 생성됩니다.
- 구버전 `<install_dir>/config.user.json`이 있으면 1회 마이그레이션합니다.

## 9. 패키징 점검 (Playwright 브라우저)

1. 설치 패키지 컴파일 전에 `packaging/build.ps1 -Clean` 실행.
2. 산출물에 `playwright-browsers/chromium-*` 존재 여부 확인.
3. 설치 후 `BrowserType.launch: Executable doesn't exist` 오류가 나오면 브라우저 파일 패키징/복사 누락입니다.
4. 해결 순서: `build.ps1 -Clean` 재실행 -> 설치 패키지 재컴파일 -> 구버전 제거 후 재설치.

## 10. 유지보수 주의사항

1. `site_bot.py`에 공급사/HS 매핑을 하드코딩하지 않습니다.
2. 실제 매핑 데이터는 로컬 CSV에 두고 저장소에는 커밋하지 않습니다.
3. 하드코딩 sleep보다 Playwright 자동 대기를 우선 사용합니다.
4. 장애 추적을 위해 `*.raw.json`, `*.record.json`을 유지합니다.
