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
npm run build:gh                  # base = /mycore12/
REPO=저장소이름 npm run build:gh   # base = /저장소이름/
```

이 스크립트는 다음을 함께 처리합니다.

- `VITE_BASE` 로 에셋 경로를 `/저장소이름/assets/...` 로 생성
- 라우터 `basename` 을 동일한 base 로 맞춤
- `dist/404.html` 생성 (GitHub Pages 는 `_redirects` 를 지원하지 않으므로
  딥링크 새로고침 fallback 용)
- `dist/.nojekyll` 생성 (`_` 로 시작하는 파일이 무시되는 것을 방지)

빌드 후 `dist/` 내용을 `gh-pages` 브랜치 또는 저장소 설정의 Pages 소스 폴더에
올리면 됩니다.

권장 서버 헤더: `assets/*` 는 장기 캐시(immutable), `index.html` 은 `no-cache`.

---

## Source of Truth (원본 그대로 사용 — 수정 금지)

| 위치 | 역할 |
|---|---|
| `src/vendor/positive_assessment_engine_FINAL_v3.1.js` | 36문항 층화 추출 + 채점 엔진 |
| `src/vendor/positive_144_situational_question_bank_FINAL_v3.1.js` | 144문항 문항은행 |
| `src/data/positive_64_type_dataset_bundle_v2.1.json` | 64유형 메타데이터·결과 콘텐츠 |
| `src/data/positive_144_situational_question_bank_FINAL_v3.1.json` | 문항은행 JSON 기준본 |
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

## 저장 데이터 마이그레이션

브랜드 변경 이전 버전의 `core12.*` localStorage key는 앱 시작 시
`migrateLegacyStorage()` 가 `mycore12.*` 로 1회 이전합니다. 응답 데이터,
12에너지 점수, 6축 점수, 유형 코드, 유형 결과는 변형 없이 그대로 보존되며,
신규 key가 이미 있으면 덮어쓰지 않습니다.

## 데이터 버전

- 문항은행 `3.1-operational-final` (내용 감수 완료 / 심리측정 검증 예정)
- 유형 데이터셋 `v2.1`
- 엔진 `FINAL_v3.1`
