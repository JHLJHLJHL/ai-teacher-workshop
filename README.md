# 생기부AI작업실_slide

「생기부 AI 작업실」 교사 연수(2026. 11. 24(화) 죽변고등학교) 발표 슬라이드.

## 구성

| 경로 | 내용 |
|---|---|
| `슬라이드-원고.md` | 원본. 장마다 소제목·제목·설명·배치·본문·발표 메모 |
| `build-deck.mjs` | 원고 → `deck/index.html` 생성 |
| `deck/` | 슬라이드(index.html · deck.css · deck.js · fonts) |
| `images/` | 앱 아이콘·그림·앱 화면 캡처 |
| `디자인-메모.md` | 색·글꼴·배치 규칙과 결정 기록 |
| `그림-프롬프트.md` | 그림 생성 프롬프트와 그림 칸 크기 |
| `번호-57장.md`, `번호-대조-83장.md` | 예전 장 번호 ↔ 지금 원고 대조표 |
| `card-convert.mjs`, `sync-57.mjs` | 원고 편집 보조 도구 |
| `capture/` | 앱 화면 캡처(Playwright). 3in1 저장소의 테스트 도구를 씀 |

## 쓰는 법

원고를 고친 뒤 슬라이드를 다시 만든다(Node 22 이상).

```bash
node build-deck.mjs
```

`deck/index.html`을 브라우저로 열거나, 이 폴더에서 `python -m http.server 5191` 후 `http://localhost:5191/deck/index.html`.

조작: `←` `→` `Space` 이동 · `F` 전체 화면 · `N` 발표 메모 · 헤더 번호로 장 이동.

## 앱 화면 캡처 다시 찍기

`D:/projects/3in1` 에서 실행(3in1의 e2e 테스트 서버와 가짜 AI 응답을 씀).

```bash
npx playwright test --config "D:/projects/slides/생기부AI작업실_slide/capture/playwright.capture.config.mjs"
```
