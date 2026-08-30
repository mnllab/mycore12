# MYCORE12 웹앱 변경 기록

이 문서는 배포 버전별로 무엇이 바뀌었는지 기록한다. 새 버전을 만들 때마다
이 파일 맨 위에 새 항목을 추가한다.

## 날짜 표기에 대한 정직한 안내

`v7.1`(2026-08-30 기록 시점)까지의 항목은 이번 개발 세션 안에서 사실과 다르지
않게 **재구성**한 기록이다. 각 버전이 실제로 만들어질 당시 날짜를 그때그때
따로 적어두지 않았기 때문에, 아래 두 시점만 확실하게 구분할 수 있었다.

- **2026-08-29** — 64유형 personaName 확정 · 콘텐츠 전수 개편(v2.2 → v3.0)
  단계. 데이터 파일 자체의 `changeNote`에 이 날짜가 남아 있어 확인 가능하다.
- **2026-08-30** — 그 이후 지금까지의 모든 웹앱 버전(GitHub 저장소 정리부터
  최신 콘텐츠 확장까지). 이 구간 안에서 버전별로 실제 며칠에 나왔는지는
  구분해서 남겨두지 않았다.

즉 `v4.6`부터 `v7.1`까지 날짜란이 전부 "2026-08-30"으로 같은 것은 오류가
아니라 **기록을 시작한 시점의 한계**다. **이 문서가 생긴 이후(다음 버전부터)는
실제로 작업한 날짜를 그때그때 정확히 적는다.**

---

## v7.1 — 2026-08-30

용어·시각적 잡음 정리.

- "유형명" → "유형"으로 표현 통일 (공개 콘텐츠 전반)
- 카드형 링크 4종(`/about`·`/guide`·`/stories` 탐색 카드, 읽을거리 카드)의
  의도치 않은 밑줄 제거

## v7.0 — 2026-08-30

공개 콘텐츠 대규모 확장 ("읽을거리" 허브 신설).

- 신규 페이지: `/about`, `/energies`, `/guide`, `/stories`, `/stories/:slug`
- `/how` 페이지 전면 재작성 + 2열 grid 레이아웃 버그 수정(본문이 92px 좁은
  열로 떨어지던 문제)
- 읽을거리 8편(한국어/영어) 신설, 문항·유형 데이터와 완전히 분리해 관리
- 언어별 줄바꿈 규칙 분리(`:lang(ko)` keep-all vs `:lang(en)` normal),
  전역 `overflow-wrap: anywhere` 제거(영어 단어가 중간에서 끊기던 문제)
- Home 정보 섹션 확장(소개/6쌍/활용/읽을거리 티저), Result 하단에 관련
  읽을거리 2편 추가
- 헤더/푸터 탐색 구조 확장, 경로별 title/description(OG 포함) 연결

## v6.4 — 2026-08-30

검사 응답 UI 마무리 다듬기.

- 영어 모바일 응답 문구 확정: Much more / A little more / About the same /
  A little more / Much more
- 한국어·영어 모두 응답 버튼 글자색을 오른쪽 indicator 색상과 동일한 명암
  순서로 적용(A strong → A soft → neutral → B soft → B strong)

## v6.3 — 2026-08-30

- 시작 화면에 "새로 시작하기" 버튼 추가(진행 중 세션이 있을 때 "이어서
  진행하기" 옆에 노출, 확인 후 세션만 초기화하고 완료된 결과는 보존)

## v6.2 — 2026-08-30

영어 레이아웃 보정 + 결과 내보내기 기능.

- 영어 전용 레이아웃 보정(`html[lang="en"]`): 검사 길이 카드 세로 배치,
  짧은 라벨 줄바꿈 방지, Home Orbit·Result EnergyMap의 12개 라벨이 겹치거나
  잘리지 않도록 차트 본체 축소 + 라벨 안전 영역 확보
- 결과 다운로드 기능 신설: 한국어/영어 × Markdown/텍스트 4종, 서버 전송 없는
  브라우저 로컬 다운로드, 채점·세션 상태 변경 없음(읽기 전용)

## v6.1 (og_final)

Open Graph 이미지(`og-image.png`) 반영 및 관련 메타 정리.
(이 버전은 별도로 준비되어 다음 단계의 시작점으로 전달받았다.)

## v6.0 (adsense_seo_naver) — 2026-08-30

Google AdSense · Google Search Console · Naver Search Advisor 연결 준비.

- 소유확인 meta 3종(정적 `index.html`), `ads.txt` / `robots.txt` /
  `sitemap.xml` 신설, JSON-LD(WebSite/WebApplication) 추가
- 광고 스크립트·광고 슬롯은 이번 단계에서 넣지 않음(계정 연결까지만)
- `build:single`이 위 SEO 정적 파일을 삭제하지 않도록 수정
- 개인정보 안내에 광고/쿠키 관련 사전 설명 추가

## Stage 4 — i18n 최종 QA (i18n_final) — 2026-08-30

- ko/en UI 리소스 leaf key 구조 동등성 검증 추가, 누락 5개 key 보완
  (`nav.principle`, `nav.localeAria`, `assessment.scaleMuch/Little/Same`)
- English 잔존 한국어 전수 검수, 64유형 결과 전수 렌더 QA

## Stage 3 — 영문 64유형 결과 연결 (i18n_types) — 2026-08-30

- 승인된 영문 64유형 결과 콘텐츠(`src/locales/en/types.json`)를 code 기준으로
  연결. personaName·headline·overview 등 표시 콘텐츠만 대상이며 채점 관련
  내부 필드는 한국어 원본 유지

## Stage 2 — 영문 144문항 연결 (i18n_questions) — 2026-08-30

- 승인된 영문 문항 오버레이(`src/locales/en/questions.json`)를 id 기준으로
  연결. Stage 1에서 만든 한국어 fallback 구조를 실제 영문 콘텐츠로 교체
- Stage 1에서 누락됐던 두 곳 수정: OrbitGraphic 에너지 라벨 영문화,
  Assessment 헤더의 브랜드 표기 규칙(영어에서는 MYCORE12만 표시)

## Stage 1 — 다국어 기반 구조 (i18n_stage1) — 2026-08-30

- ko/en locale 아키텍처 신설(React Context, 외부 i18n 라이브러리 없음)
- 헤더에 언어 선택 UI, 문항/유형 오버레이 연결 구조(이 시점엔 영문 데이터
  없이 한국어 fallback), 축·에너지 표시명 glossary 매핑
- Result.tsx의 한국어 특정 문구 기반 파싱 로직을 locale 중립 방식으로 교체

## 저장소 정리 (GITHUB_REPO_v1)

- `.gitignore` 신설(그동안 없었음), 미참조 데이터 파일 3건과 구버전
  스캐폴딩 폴더 제거, README 전면 재작성

## v5.3 / v5.2 / v5.1 (mobile_ui) / v5.0 — 2026-08-30

검사 응답 UI 확정 과정.

- v5.0: Primary 색상을 Dark Gray Blue 계열로 전환, 검사 길이 선택
  (18/36/54/72) 신설, app-like interaction(터치·safe area 등) 적용
- v5.1: 모바일 응답 UI를 5단 세로 배치로 재설계(A 문장 상단 → 5개 버튼
  → B 문장 하단), indicator strong/soft/neutral/soft/strong 대칭 확정
- v5.2: 두 보기 문장 중앙 정렬 + 색 구분, 중립 문구를 "둘 다 비슷하다"로,
  데스크톱 dot 대칭 색 적용, 헤더에 Buy Me a Coffee 버튼 추가
- v5.3: 데스크톱/모바일 응답 문구 통일, 문장 색을 남색/와인색 고정 색으로,
  모바일 버튼 폭 축소

## v4.9 / v4.8 / v4.7 / v4.6 — 2026-08-30

- v4.6: 64유형 personaName 64개 확정 반영(데이터 v2.2), 파일럿 문체 정리(v2.3)
- v4.7: 64유형 결과 콘텐츠 전수 개편본(v3.0)을 웹앱에 실제 연결
- v4.8: 결과 페이지 디자인 전면 개편(Professional·Refined·Calm 톤,
  12에너지 muted 컬러, 카드 일변도 탈피)
- v4.9: 블라인드 QA로 발견한 결함 수정(페이지 내 문장 중복, 어색한 headline,
  균형 bar 문구)

---

## 이전 단계 (별도 관리) — 2026-08-29

마이코어12(MYCORE12) 64유형 personaName 작명 확정과 결과 콘텐츠 전수 개편
(문체를 "쉽게 읽히는 정제된 설명체"로 전환). 이 작업은 위 웹앱 저장소가
아니라 데이터 산출물(작명 확정표, `MYCORE12_64_type_dataset_v3.0.json` 등)
형태로 별도 전달됐다. 날짜는 데이터 파일 `changeNote`에 남아 있어 확인했다.
