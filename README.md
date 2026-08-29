# 마이코어12 · MYCORE12

나를 이루는 12가지 에너지 — 6축 기반 성향 프로파일
웹앱 · React + TypeScript + Vite (SPA)

© Janggil Kim. All Rights Reserved.
무단 복제 및 재배포를 금지합니다.

---

## 실행

```bash
npm install     # Node.js 18 이상
npm run dev     # 개발 서버 → http://localhost:5173
npm test        # 자동 테스트 102개
```

## 프로덕션 빌드

```bash
npm run build     # dist/ 생성 (tsc 타입검사 + vite build)
npm run preview   # 빌드 결과 로컬 확인 → http://localhost:4173
```

> `dist/index.html` 을 파일 탐색기에서 직접 열면(`file://`) 빈 화면이 나옵니다.
> 반드시 `npm run dev`, `npm run preview` 또는 웹 서버로 접속하세요.

## 배포 시 환경 설정

**환경변수는 필요하지 않습니다.** 서버·API·데이터베이스 없이 동작하는
정적 SPA이며, 모든 데이터는 브라우저 로컬 저장소에만 저장됩니다.

필요한 설정은 **SPA fallback 하나뿐**입니다. `/result/:id` 같은 딥링크를
새로고침할 때 404가 나지 않도록, 모든 경로를 `index.html` 로 넘겨야 합니다.
아래 설정 파일이 이미 포함되어 있습니다.

| 호스팅 | 파일 | 비고 |
|---|---|---|
| Netlify | `netlify.toml`, `public/_redirects` | 추가 설정 불필요 |
| Vercel | `vercel.json` | 추가 설정 불필요 |
| Apache / cPanel | `public/.htaccess` | `mod_rewrite` 활성화 필요 |
| Nginx | 아래 스니펫 | 직접 추가 |
| GitHub Pages | `npm run build:gh` | 하위 경로 배포이므로 **반드시 이 명령 사용** |

```nginx
location / {
  root /var/www/mycore12/dist;
  try_files $uri $uri/ /index.html;
}
```

배포 대상은 `dist/` 폴더 전체입니다.

### 하위 경로 배포 (GitHub Pages 등)

`https://<계정>.github.io/<저장소>/` 처럼 **루트가 아닌 경로**에 배포할 때는
에셋 경로를 그 base 에 맞춰 빌드해야 합니다. 그냥 `npm run build` 결과를 올리면
브라우저가 `/assets/...` 를 찾다가 404가 나고 **화면이 비어 보입니다.**

```bash
npm run build:gh
```

저장소 이름을 지정할 필요가 없습니다. 이 스크립트가 GitHub Pages 의 두 가지
제약을 함께 우회합니다.

| 제약 | 대응 |
|---|---|
| 저장소 이름이 하위 경로가 됨 | 에셋을 `./assets/...` 상대경로로 빌드 — 어느 폴더에 올려도 동작 |
| `_redirects` 등 rewrite 미지원 | HashRouter 사용 (`/mycore12/#/result/…`) + `404.html` 생성 |
| `_` 로 시작하는 파일 무시 | `.nojekyll` 생성 |

빌드 후 **`dist/` 폴더의 내용물**(폴더 자체가 아니라 그 안의
`index.html`, `assets/`, `404.html`, `.nojekyll` 등)을 `gh-pages` 브랜치 또는
Pages 소스 폴더에 올리면 됩니다.

배포가 반영됐는지 확인하는 방법: 페이지 소스에서 `<script src="./assets/...">`
처럼 **`./` 로 시작**하면 새 빌드입니다. `/assets/` 로 시작하면 아직 예전
빌드가 올라가 있는 것입니다.

권장 서버 헤더: `assets/*` 는 장기 캐시(immutable), `index.html` 은 `no-cache`.

---

## Source of Truth (원본 그대로 사용 — 수정 금지)

| 위치 | 역할 |
|---|---|
| `src/vendor/positive_assessment_engine_FINAL_v3.1.js` | 36문항 층화 추출 + 채점 엔진 |
| `src/vendor/positive_144_situational_question_bank_FINAL_v3.1.js` | 144문항 문항은행 |
| `src/data/positive_64_type_dataset_bundle_v2.1.json` | 64유형 메타데이터·결과 콘텐츠 |
| `src/data/positive_144_situational_question_bank_FINAL_v3.1.json` | 문항은행 v3.1 원본 (수정 금지) |
| `src/data/positive_144_situational_question_bank_v3.2.json` | **운영 문항은행 v3.2** — 화면·조회에 사용 |
| `src/data/positive_question_readability_pilot_v3.2.json` | v3.1 → v3.2 윤문 변경 기록 |
| `src/data/positive_144_question_bank_FINAL_review_QA_v3.1.json` | 감수·QA 데이터 |

네 개 핵심 파일의 SHA256은 `PACKAGE_MANIFEST.json` 값과 일치하며,
`tests/audit.test.ts` 가 매 테스트마다 이를 검증합니다. 앱 레이어는 이
파일들을 import만 하고 추출·채점 로직을 재구현하지 않습니다.

## 폴더 구조

```
mycore12-app/
├── index.html                 HTML 진입점 (title/meta)
├── package.json               스크립트 · 의존성
├── tsconfig.json              TypeScript 설정
├── vite.config.ts             빌드 · 코드분할 · 테스트 설정
├── vercel.json                Vercel SPA fallback
├── netlify.toml               Netlify 빌드 · SPA fallback
├── public/
│   ├── _redirects             Netlify SPA fallback
│   ├── .htaccess              Apache SPA fallback
│   ├── manifest.webmanifest   PWA manifest (마이코어12)
│   └── brand-mark.svg         파비콘 · OG 이미지 · PWA 아이콘
├── src/
│   ├── main.tsx               React 진입점
│   ├── App.tsx                라우팅 + ErrorBoundary
│   ├── vendor/                원본 엔진 · 문항은행 (수정 금지)
│   ├── data/                  원본 JSON 데이터 (수정 금지)
│   ├── lib/
│   │   ├── mycore12.ts        브랜드 상수 · 타입 · 유형 매칭 · 파생값 · 노출 문구 필터
│   │   ├── storage.ts         세션 · 최근문항 · 결과 저장 + legacy key 마이그레이션
│   │   └── ordering.ts        표시 순서 보정 (같은 축 연속 방지)
│   ├── components/
│   │   ├── EnergyMap.tsx      12에너지 맵 SVG (고정 12각형 · 면적 채움 없음)
│   │   ├── PairBars.tsx       6쌍 양방향 균형 바
│   │   ├── OrbitGraphic.tsx   시작 화면 고정 orbit
│   │   ├── Chrome.tsx         헤더 · 푸터(저작권 · 결과 삭제)
│   │   └── ErrorBoundary.tsx  오류 복구 화면
│   ├── pages/
│   │   ├── Home.tsx           시작 화면
│   │   ├── How.tsx            검사 방식 + 개인정보 안내
│   │   ├── Assessment.tsx     36문항 진행
│   │   ├── Result.tsx         결과 (10개 섹션)
│   │   └── History.tsx        과거 기록
│   └── styles/global.css      디자인 토큰 · 전체 스타일
└── tests/
    ├── audit.test.ts          데이터 무결성 · 추출 1,000회 · 채점 · SHA256
    ├── mycore12-engine.test.ts 엔진 구조 제약 1,000회
    ├── session.test.ts        세션 복원 · 재검사 회피 · 저장 · 삭제
    ├── brand.test.ts          브랜드 표기 · storage 마이그레이션
    ├── design.test.ts         디자인 가드레일 · 반응형 · 배포 설정
    └── render.test.tsx        렌더 QA · 접근성 · 콘솔 오류 · 라우팅
```

## 브랜드 표기 규칙

공식 표기는 `src/lib/mycore12.ts` 의 `BRAND` 상수 한 곳에서만 정의합니다.

| 용도 | 표기 |
|---|---|
| 한국어 화면 (주 브랜드) | 마이코어12 |
| 영문 · 보조 브랜드 | MYCORE12 |
| 락업 (푸터 등) | 마이코어12 · MYCORE12 |
| slug · storage key · 청크명 | mycore12 |

아래 표기는 공식 브랜드로 사용하지 않으며, `tests/brand.test.ts` 가 자동으로
차단합니다.

<!-- deprecated-brand-list:start -->
`MyCore12` · `Mycore12` · `My Core 12` · `MY CORE 12` · `MYCORE 12` · `CORE12`
<!-- deprecated-brand-list:end -->

## 로컬 데이터 정책 (공개 전 테스트 단계)

아직 실사용자가 없는 단계이므로 **과거 데이터를 이전하지 않습니다.**
앱 시작 시 `resetStaleLocalData()` 가 데이터 버전 지문을 확인해서,
직전 실행과 다르면 로컬 데이터를 지우고 깨끗한 상태로 시작합니다.

```
DATA_VERSION = `${BANK_VERSION}|${ENGINE_VERSION}|${TYPE_DATASET_VERSION}`
```

- 문항은행·엔진·유형 데이터 중 **하나라도 바뀌면** 자동 초기화
- 진행 중이던 세션, 결과 기록, 최근 문항 이력 모두 삭제
- 구 브랜드(`core12.*`) 잔여 key도 값을 옮기지 않고 함께 정리
- `내 결과 삭제`는 검사 데이터만 지우고 버전 지문은 남김

덕분에 문항을 수정하거나 새로 배포할 때 **덮어쓰기만 하면 되고**, 이전 데이터가
남아 화면이 꼬이는 일이 없습니다.

> 실사용자가 생긴 뒤 데이터를 보존해야 한다면, `resetStaleLocalData()` 를
> 버전별 이전 로직으로 교체하면 됩니다. 호출 지점은 `src/main.tsx` 한 곳입니다.

## 데이터 버전

- 운영 문항은행 `3.2-readability` — v3.1 의 12문항 표시 문구를 윤문한 정식 버전.
  문항 ID·축·상황·A/B 방향·응답 매핑이 v3.1 과 동일하므로 채점 결과는 달라지지
  않는다. 추출·채점 엔진은 v3.1 모듈을 그대로 사용한다.
- 원본 문항은행 `3.1-operational-final` (보존, 수정 금지)
- 유형 데이터셋 `v2.1`
- 엔진 `FINAL_v3.1`
