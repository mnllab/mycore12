# 마이코어12 · MYCORE12

나를 이루는 12가지 에너지 — 6축 기반 성향 프로파일
웹앱 · React + TypeScript + Vite (SPA)

© Janggil Kim. All Rights Reserved.
저작권자의 허락 없이 무단 복제 및 재배포를 금지합니다.

---

## 실행

```bash
npm install     # Node.js 18 이상
npm run dev     # 개발 서버 → http://localhost:5173
npm test        # 자동 테스트 225개
```

## 배포 방식 (고정) — 단일 파일

**실제 운영 배포는 이 방식 하나만 쓴다.** 버전업 때마다 아래 배포 산출물을 만들어
GitHub 저장소 루트에 덮어쓴다.

```bash
npm run build:single
```

```
dist-single/index.html    ← 앱 전체가 인라인된 자기완결형 파일
dist-single/404.html      ← 같은 내용의 복사본 (GitHub Pages 딥링크 대응)
dist-single/ads.txt       ← AdSense 게시자 확인
dist-single/robots.txt    ← 크롤러 허용 + sitemap 위치
dist-single/sitemap.xml   ← 루트 canonical URL
dist-single/og-image.png   ← SNS / 메신저 링크 공유 이미지 (1200×630)
dist-single/.nojekyll     ← GitHub Pages 가 _ 로 시작하는 파일을 무시하지 않게
```

- 앱 실행에 필요한 외부 에셋 요청 0건 → 폴더 위치·저장소 이름·슬래시 유무와 무관하게 동작
- HashRouter 사용 → 서버 rewrite 설정 불필요
- `file://` 로 더블클릭해도 동작하므로 업로드 전 사전 확인 가능

배포할 때는 **위 7개 파일을 도메인 루트에** 올린다. `ads.txt` · `robots.txt` ·
`sitemap.xml` · `og-image.png` 는 검색엔진·광고·SNS 봇이 루트에서 직접 읽으므로 하위 폴더에 두면
안 된다. GitHub 웹 UI 의 "Upload files" 로 덮어쓰면 된다.

배포 후 아래 URL이 모두 정상이어야 한다.

```
https://mycore12.com/
https://mycore12.com/ads.txt
https://mycore12.com/robots.txt
https://mycore12.com/sitemap.xml
https://mycore12.com/og-image.png
```

환경변수는 필요 없다. 서버·API·데이터베이스 없이 동작하는 정적 SPA이며,
모든 데이터는 브라우저 로컬 저장소(localStorage)에만 저장된다.

### 그 외 배포 방식 (보조·미사용)

아래는 다른 방식으로 호스팅할 경우를 위해 설정 파일만 남겨둔 것이며,
현재 운영에서는 사용하지 않는다.

| 호스팅 | 파일 | 명령 |
|---|---|---|
| Netlify | `netlify.toml`, `public/_redirects` | `npm run build` |
| Vercel | `vercel.json` | `npm run build` |
| Apache / cPanel | `public/.htaccess` (mod_rewrite 필요) | `npm run build` |
| GitHub Pages 하위 경로 분할 빌드 | `npm run build:gh` | 에셋 경로 문제로 흰 화면 이력 있음 — 요청 시에만 사용 |

## 폴더 구조

```
(zip 최상위 = 저장소 루트)
├── index.html                 HTML 진입점 (title/meta/OG/PWA)
├── package.json               스크립트 · 의존성
├── tsconfig.json               TypeScript 설정
├── vite.config.ts              빌드 · 코드분할 · 테스트 설정
├── eslint.config.js            린트 설정
├── .gitignore                  node_modules/dist/캐시 제외
├── netlify.toml / vercel.json   보조 호스팅 설정 (미사용, 참고용)
├── public/
│   ├── _redirects, .htaccess   보조 호스팅 SPA fallback (미사용, 참고용)
│   ├── manifest.webmanifest    PWA manifest
│   ├── brand-mark.svg          파비콘 · PWA 아이콘
│   └── og-image.png            SNS / 메신저 링크 공유 이미지 (1200×630)
├── docs/
│   └── MYCORE12_결과지_문체가이드_v1.0.md   결과 콘텐츠 문체 가이드
├── src/
│   ├── main.tsx                React 진입점
│   ├── App.tsx                 라우팅 + ErrorBoundary
│   ├── vendor/                 원본 엔진 · 문항은행 ES Module (수정 금지)
│   │   ├── positive_assessment_engine_FINAL_v3.1.js
│   │   └── positive_144_situational_question_bank_FINAL_v3.1.js
│   ├── data/                   원본·운영 JSON 데이터
│   │   ├── MYCORE12_64_type_dataset_v3.0.json        정식 운영 64유형 콘텐츠
│   │   ├── positive_144_situational_question_bank_FINAL_v3.2.json  운영 문항은행(화면 표시용)
│   │   ├── positive_144_situational_question_bank_FINAL_v3.1.json  문항은행 v3.1 원본(수정 금지)
│   │   ├── positive_question_bank_changelog_v3.2.json  v3.1→v3.2 변경 이력(144문항 전수)
│   │   ├── positive_64_type_dataset_bundle_v2.1.json   64유형 원본(수정 금지)
│   │   ├── positive_64_type_dataset_bundle_v2.2.json   personaName 확정 개편본(이력)
│   │   └── positive_64_type_plain_pilot_v2.3.json      쉬운 문체 파일럿(이력, 현재 미사용)
│   ├── lib/
│   │   ├── mycore12.ts         브랜드 상수 · 타입 · 유형 매칭 · 파생값 · 노출 문구 필터
│   │   ├── draw.ts             검사 길이(18/36/54/72)별 층화 추출
│   │   ├── storage.ts          세션 · 최근문항 · 결과 저장 + legacy key 마이그레이션
│   │   └── ordering.ts         표시 순서 보정 (같은 축 연속 방지)
│   ├── components/
│   │   ├── EnergyMap.tsx       12에너지 맵 SVG (고정 12각형 · 면적 채움 없음 · muted 12색)
│   │   ├── PairBars.tsx        6쌍 양방향 균형 바
│   │   ├── OrbitGraphic.tsx    시작 화면 고정 orbit
│   │   ├── Chrome.tsx          헤더(후원 링크 포함) · 푸터(저작권 · 결과 삭제)
│   │   ├── ErrorBoundary.tsx   오류 복구 화면
│   │   └── icons.tsx           Lucide 계열 line icon
│   ├── pages/
│   │   ├── Home.tsx            시작 화면 + 검사 길이 선택(18/36/54/72)
│   │   ├── How.tsx             검사 방식 + 개인정보 안내
│   │   ├── Assessment.tsx      문항 진행 (모바일 세로열 / 데스크톱 좌우 비교)
│   │   ├── Result.tsx          결과 (12개 섹션)
│   │   └── History.tsx         과거 기록
│   └── styles/global.css       디자인 토큰 · 전체 스타일 · app-like interaction
└── tests/                      14개 파일 · 225개 테스트
    ├── audit.test.ts               데이터 무결성 · 추출 1,000회 · 채점 · SHA256
    ├── mycore12-engine.test.ts     엔진 구조 제약 1,000회
    ├── assessment-length.test.ts   18/36/54/72 층화 추출 4,000회 · 정규화
    ├── assessment-length-flow.test.tsx  길이 선택 → 검사 → 결과 실제 흐름
    ├── bank-v32.test.ts / bank-v32-integration.test.ts  문항은행 v3.2 검증
    ├── content-v3.test.ts          64유형 결과 콘텐츠 v3.0 문체·정책 검수
    ├── choice-display.test.tsx     검사 화면 표시 규칙(문장 색·indicator 대칭 등)
    ├── session.test.ts             세션 복원 · 재검사 회피 · 저장 · 삭제
    ├── brand.test.ts               브랜드 표기 · storage 마이그레이션
    ├── design.test.ts              디자인 가드레일 · 반응형 · 배포 설정
    ├── app-shell.test.ts           app-like interaction(터치·safe area·PWA 등)
    └── render.test.tsx             렌더 QA · 접근성 · 콘솔 오류 · 라우팅
```

## Source of Truth (원본 그대로 사용 — 수정 금지)

| 위치 | 역할 |
|---|---|
| `src/vendor/positive_assessment_engine_FINAL_v3.1.js` | 문항 추출 + 채점 엔진 |
| `src/vendor/positive_144_situational_question_bank_FINAL_v3.1.js` | 144문항 문항은행 (추출 구조 기준) |
| `src/data/positive_64_type_dataset_bundle_v2.1.json` | 64유형 원본 메타데이터 |
| `src/data/positive_144_situational_question_bank_FINAL_v3.1.json` | 문항은행 v3.1 원본 JSON |
| `src/data/MYCORE12_64_type_dataset_v3.0.json` | **정식 운영** 64유형 결과 콘텐츠 |
| `src/data/positive_144_situational_question_bank_FINAL_v3.2.json` | **정식 운영** 문항은행 — 화면·조회에 사용 |

핵심 파일의 SHA256을 `tests/audit.test.ts` 가 매 실행마다 검증한다. 앱 레이어는
이 파일들을 import만 하고 추출·채점 로직을 재구현하지 않는다.

## 데이터 버전 · 관계

- 운영 문항은행 `3.2-readability` — v3.1의 144문항 표시 문구(scenario/optionA/optionB)를
  전부 윤문한 정식 버전. id·axis·context·optionAValue·optionBValue·responseScale·active는
  v3.1과 완전히 동일하므로 추출·채점 결과는 달라지지 않는다. 엔진과 추출 로직은
  v3.1 모듈을 그대로 쓰고, 화면 표시와 문항 조회만 v3.2를 쓴다.
  변경 이력은 `positive_question_bank_changelog_v3.2.json`.
- 64유형 결과 콘텐츠 `v3.0.0` (basedOn `2.2.0`) — personaName 확정(`v2.2`) 이후
  전체 문체를 "쉽게 읽히는 정제된 설명체"로 전수 개편한 정식 버전.
  `v2.1`(원본)·`v2.2`(이름 확정본)는 이력으로 보존.
- 검사 길이 `18 / 36 / 54 / 72` (기본값 36) — 144문항 은행에서 길이별로
  층화 추출(`src/lib/draw.ts`). 어떤 길이를 선택해도 axis pair 합 100,
  12에너지 총합 600이 유지된다.

## 브랜드 표기 규칙

공식 표기는 `src/lib/mycore12.ts` 의 `BRAND` 상수 한 곳에서만 정의한다.

| 용도 | 표기 |
|---|---|
| 한국어 화면 (주 브랜드) | 마이코어12 |
| 영문 · 보조 브랜드 | MYCORE12 |
| 락업 (푸터 등) | 마이코어12 · MYCORE12 |
| slug · storage key · 청크명 | mycore12 |

아래 표기는 공식 브랜드로 사용하지 않으며, `tests/brand.test.ts` 가 자동으로
차단한다.

<!-- deprecated-brand-list:start -->
`MyCore12` · `Mycore12` · `My Core 12` · `MY CORE 12` · `MYCORE 12` · `CORE12`
<!-- deprecated-brand-list:end -->

## 로컬 데이터 정책 (공개 전 테스트 단계)

아직 실사용자가 없는 단계이므로 **과거 데이터를 이전하지 않는다.**
앱 시작 시 `resetStaleLocalData()` 가 데이터 버전 지문을 확인해서,
직전 실행과 다르면 로컬 데이터를 지우고 깨끗한 상태로 시작한다.

```
DATA_VERSION = `${BANK_VERSION}|${ENGINE_VERSION}|${TYPE_DATASET_VERSION}`
```

- 문항은행·엔진·유형 데이터 중 **하나라도 바뀌면** 자동 초기화
- 진행 중이던 세션, 결과 기록, 최근 문항 이력 모두 삭제
- 구 브랜드(`core12.*`) 잔여 key도 값을 옮기지 않고 함께 정리
- `내 결과 삭제`는 검사 데이터만 지우고 버전 지문은 남김

실사용자가 생긴 뒤 데이터를 보존해야 한다면, `resetStaleLocalData()` 를
버전별 이전 로직으로 교체하면 된다. 호출 지점은 `src/main.tsx` 한 곳뿐이다.

## 배포 후 수동 절차 (검색엔진 · 광고)

소유확인 meta 세 개(`google-adsense-account`, `google-site-verification`,
`naver-site-verification`)와 JSON-LD 는 소스 `index.html` 에 정적으로 들어 있고
빌드 산출물에도 그대로 남는다. 아래는 배포 후 각 서비스 콘솔에서 직접 해야 하는 작업이다.

### Google AdSense

1. `https://mycore12.com/ads.txt` 가 plain text 로 열리는지 직접 확인
2. AdSense → Sites 에서 `mycore12.com` 확인
3. meta tag 방식으로 Verify
4. Request review
5. Privacy & messaging 에서 **EEA/UK/Switzerland 용 Google-certified CMP 설정 확인**
6. 승인 전까지 코드에 광고 unit 을 임의로 추가하지 않는다

> 이번 릴리스는 **계정 연결과 심사 준비까지만** 한다. `adsbygoogle.js` 스크립트와
> `<ins class="adsbygoogle">` 광고 슬롯은 넣지 않았다. 승인 후 별도 단계에서
> Home / How / Privacy 같은 공개 콘텐츠 영역에 한정해 설계한다.

### Google Search Console

1. URL-prefix 속성 `https://mycore12.com/` 에서 meta verification 확인
2. `https://mycore12.com/sitemap.xml` 제출

### Naver Search Advisor

1. `https://mycore12.com` 소유확인
2. robots.txt 검증 / 수집 요청
3. sitemap.xml 제출
4. URL 검사에서 root title · description · indexability 확인

## SEO 범위 (v1)

현재 배포는 GitHub Pages 단일 파일 + HashRouter 다. 검색엔진은 `#` 뒤 fragment 를
독립 URL 로 취급하지 않으므로 `/#/how`, `/#/privacy`, `/#/assessment`,
`/#/result/…` 는 색인 대상 페이지로 보지 않는다.

따라서 **SEO v1 의 indexable canonical 은 루트(`https://mycore12.com/`) 하나**이고,
sitemap 에도 루트만 넣는다. 언어는 같은 URL에서 상태로 전환되므로 `hreflang` 도
넣지 않았다(실제로 크롤링 가능한 언어별 URL이 없는데 hreflang 을 넣으면 잘못된 신호가 된다).

자세한 배경과 향후 선택지는 `docs/SEO_ADSENSE_NOTES.md` 참고.

## 다국어(i18n) 착수 전 참고

- 사용자 노출 문자열은 현재 두 곳에 있다: ① `src/data/*.json`(문항·64유형 콘텐츠),
  ② `src/pages/*.tsx` · `src/components/*.tsx` 안의 하드코딩된 한국어 문자열
  (버튼 라벨, 섹션 제목, 안내문 등). 다국어화 시 두 경로 모두 다뤄야 한다.
- `BRAND` 상수(`src/lib/mycore12.ts`)와 브랜드명(마이코어12/MYCORE12)은
  `tests/brand.test.ts` 가 자동 검증하므로, 언어별 표기를 늘릴 때도 이 테스트
  기준을 함께 갱신해야 한다.
- 채점 엔진(`src/vendor/`)과 추출 구조(`src/lib/draw.ts`)는 언어와 무관한
  코드값(`optionAValue`/`optionBValue`/`axis`/`context`)으로 동작하므로, 표시
  언어를 늘려도 채점 로직은 그대로 재사용할 수 있다.
- 결과 콘텐츠(`MYCORE12_64_type_dataset_v3.0.json`)는 필드당 완결된 한국어
  문장 하나뿐인 구조라, 다국어본을 추가할 때는 필드 안에 언어 키를 넣는 구조
  변경이 필요한지, 언어별 파일을 통째로 병행 관리할지부터 결정하는 것이 좋다.
