# SEO · AdSense 노트 (v1)

이 문서는 2026-08-29 릴리스에서 적용한 검색엔진·광고 연결의 범위와, 지금 구조에서
의도적으로 하지 않은 것들을 기록한다.

## 확정값

| 항목 | 값 |
|---|---|
| Production domain | `https://mycore12.com` |
| AdSense Publisher ID | `ca-pub-3498593810862454` |
| ads.txt Publisher ID | `pub-3498593810862454` |
| Google Search Console | meta 방식 소유확인 |
| Naver Search Advisor | meta 방식 소유확인 |

## 적용한 것

- 소유확인 meta 3종을 **소스 `index.html` 의 `<head>` 에 정적으로** 배치
  (런타임 삽입을 쓰면 크롤러가 HTML만 받아갈 때 태그를 못 볼 수 있다)
- `canonical` / `og:url` = `https://mycore12.com/`
- `robots` meta = `index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1`
- `og:locale` = `ko_KR`, `og:locale:alternate` = `en_US`
- JSON-LD `WebSite` + `WebApplication` (`@graph`)
- `public/ads.txt`, `public/robots.txt`, `public/sitemap.xml`
- `build:single` 이 위 세 파일을 지우지 않고 `dist-single/` 루트에 남기도록 수정,
  누락 시 빌드 실패

## 의도적으로 하지 않은 것

### 1. 광고 스크립트와 광고 슬롯

`adsbygoogle.js`, `<ins class="adsbygoogle">`, `data-ad-slot`, Auto Ads 강제 활성화를
넣지 않았다.

이유: 현재 운영은 HashRouter 단일 SPA다. 자동광고를 앱 전체에 붙이면 검사 진행
화면·결과 화면·기록 화면까지 광고가 퍼진다. 승인 후 별도 단계에서 Home / How /
Privacy 같은 공개 콘텐츠 영역에 한정해 설계한다.

### 2. 자체 쿠키 동의 배너 / Consent Mode

자체 GDPR 판별, IP 기반 국가 판별, TCF string 생성, cookie banner 를 구현하지 않았다.
AdSense → Privacy & messaging 에서 Google CMP 또는 Google-certified CMP 를 설정한다.

### 3. hreflang

한국어/영어는 **같은 URL 에서 상태로 전환**된다. 크롤링 가능한 언어별 URL 이 없는
상태에서 `hreflang` 을 넣으면 존재하지 않는 페이지를 가리키는 잘못된 신호가 된다.

### 4. fragment URL 을 sitemap 에 넣기

`/#/how`, `/#/privacy`, `/#/assessment`, `/#/result/…` 는 검색엔진이 독립 canonical
URL 로 취급하지 않는다. sitemap 에는 루트만 넣었다.

## 지금 구조의 SEO 한계

- indexable canonical 이 루트 하나뿐이다. 개별 콘텐츠(검사 방식, 개인정보 안내)가
  독립 페이지로 색인되지 않는다.
- 초기 HTML 에는 앱 셸만 있고 본문은 JS 실행 후 그려진다. Google 은 렌더링을 하지만
  Naver 등 일부 크롤러는 정적 HTML 위주로 수집한다.
- 영어 콘텐츠가 별도 URL 을 갖지 않아 영어권 검색 유입을 따로 잡기 어렵다.

## 향후 강화 시 검토할 선택지 (이번 단계에서 구현하지 않음)

1. clean permalink (BrowserRouter + SPA fallback)
2. prerender / SSG 로 주요 페이지의 정적 HTML 생성
3. `/ko/`, `/en/` 처럼 언어별 실제 URL 분리
4. 언어별 URL 이 생긴 뒤에야 `hreflang` 추가
5. 페이지별 canonical · OG · JSON-LD 분리

위 항목은 라우팅 구조 변경을 수반하므로, 배포 방식(단일 파일 GitHub Pages)과 함께
따로 검토한다.


## SNS / 메신저 공유 이미지

- 공개 URL: `https://mycore12.com/og-image.png`
- 원본 파일: `public/og-image.png`
- 규격: 1200 × 630 PNG
- `og:image` / `twitter:image` 는 절대 URL을 사용하며 `build:single`에서도 파일을 루트에 보존함
