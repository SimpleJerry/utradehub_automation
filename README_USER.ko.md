# UTradeHub Automation 사용자 안내서

## Language / 语言 / 언어
- 中文（주 문서）：[README_USER.md](./README_USER.md)
- English: [README_USER.en.md](./README_USER.en.md)
- 한국어 (현재): [README_USER.ko.md](./README_USER.ko.md)

## 0. 빠른 사용 순서 (1~6)
1. `UTradeHubAutomationSetup.exe`를 설치합니다.
2. 데스크톱 앱을 열고 실행 설정을 입력합니다.
3. “설정 저장”을 클릭합니다.
4. 처리할 PDF를 입력 폴더에 넣습니다.
5. “처리 시작”을 클릭합니다.
6. 출력 폴더와 로그 폴더에서 결과를 확인합니다.

## 1. 설치
1. `UTradeHubAutomationSetup.exe`를 더블클릭합니다.
2. 설치가 완료되면 바탕화면에 `UTradeHub Automation` 아이콘이 생성됩니다.

## 2. 최초 설정
1. 데스크톱 앱을 실행합니다.
2. “실행 설정”에 다음 항목을 입력합니다:
- 사이트 진입 URL
- 로그인 아이디 / 비밀번호
- 공급사 매핑 CSV 경로
- PDF 입력 폴더
- 결과 출력 폴더
3. “설정 저장”을 클릭합니다.

사용자 설정 파일 저장 경로:
`%LOCALAPPDATA%\UTradeHubAutomation\config.user.json`

참고:
- 설치 디렉터리의 `config.user.json.example`은 템플릿 용도입니다.
- 공급사 CSV는 `vendor_mapping.example.csv`를 복사해 사용자 파일로 사용하세요.

## 3. 실행
1. “처리 시작”을 클릭합니다.
2. 하단 로그 창에 진행 상황이 표시됩니다.
3. 완료 시 요약 팝업(전체/성공/실패)이 표시됩니다.

## 4. 출력 위치
기본 실행 파일들은 아래 경로에 저장됩니다:
`%LOCALAPPDATA%\UTradeHubAutomation`

- 입력: `data/input_pdfs`
- 출력: `data/extracted`
- 로그: `logs/run.log`

## 5. 자주 묻는 질문
1. 시작 시 “설정을 먼저 입력하세요”가 표시됨
- 최초 실행 시 정상 동작입니다. 필수 항목 입력 후 저장하세요.

2. “공급사 매핑 파일이 없습니다”
- CSV 경로가 올바른지 확인하세요.

3. “입력 폴더에 PDF가 없습니다”
- 폴더에 `.pdf` 파일이 있는지 확인하세요.

4. 웹 자동화 실패
- 계정/비밀번호, 네트워크, 사이트 접속 가능 여부를 확인하세요.
- “로그 폴더 열기” 후 `logs/run.log`를 유지보수 담당자에게 전달하세요.

5. 오류: `BrowserType.launch: Executable doesn't exist`
- Playwright 브라우저 파일이 패키지에 누락된 상태입니다.
- `packaging/build.ps1 -Clean` 실행 후 Inno Setup으로 설치 파일을 다시 빌드하세요.
- 재설치 후 `<install_dir>/playwright-browsers/chromium-*` 존재 여부를 확인하세요.
- 계속 실패하면 구버전을 제거 후 최신 버전을 재설치하세요.

## 6. 권한 안내
- `Program Files` 경로에 설치/업그레이드 시 관리자 권한이 필요할 수 있습니다.
- 일상적인 실행 및 설정 저장은 관리자 권한이 필요하지 않아야 합니다.
- 실행 시 생성되는 설정/로그/입력/출력은 모두 `%LOCALAPPDATA%\UTradeHubAutomation` 아래에 저장됩니다.