/**
 * SEO / AdSense / 검색엔진 소유확인 검수.
 *
 * 이번 릴리스의 정책
 *  - 소유확인 meta 는 **정적 index.html** 에 있어야 한다 (런타임 삽입 금지)
 *  - AdSense 는 계정 연결(meta + ads.txt)까지만 하고 광고 스크립트·슬롯은 넣지 않는다
 *  - HashRouter 구조라 indexable canonical 은 루트 하나뿐이므로
 *    sitemap 에 fragment(#/) URL 을 넣지 않는다
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const DOMAIN = "https://mycore12.com/";
const ADSENSE_PUB = "ca-pub-3498593810862454";
const ADS_TXT_LINE = "google.com, pub-3498593810862454, DIRECT, f08c47fec0942fa0";
const GSC = "VJVS27P0965ZKdTmo0ue3tClOWVFrI1Vc5_ZHOqlbHI";
const NAVER = "043ed32c20aa3c864a861b03581f0c7f8d72d552";

/** 태그 문자열에서 속성 값을 뽑는다 (줄바꿈이 섞인 멀티라인 태그도 처리) */
const metaContent = (html: string, attr: string, name: string): string | null => {
  const re = new RegExp(
    `<meta[^>]*${attr}=["']${name}["'][^>]*>|<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${name}["'][^>]*>`,
    "i"
  );
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  return tag.match(/content=["']([^"']*)["']/i)?.[1] ?? null;
};

describe("정적 index.html — 소유확인 / 광고 계정", () => {
  const html = read("index.html");
  const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));

  it("AdSense 계정 meta 가 정확한 publisher ID 로 존재한다", () => {
    expect(metaContent(html, "name", "google-adsense-account")).toBe(ADSENSE_PUB);
  });

  it("Google Search Console 소유확인 meta 가 존재한다", () => {
    expect(metaContent(html, "name", "google-site-verification")).toBe(GSC);
  });

  it("Naver Search Advisor 소유확인 meta 가 존재한다", () => {
    expect(metaContent(html, "name", "naver-site-verification")).toBe(NAVER);
  });

  it("세 태그 모두 <head> 안에 있다 (body 아님)", () => {
    for (const name of [
      "google-adsense-account",
      "google-site-verification",
      "naver-site-verification"
    ]) {
      expect(head.includes(name), name).toBe(true);
    }
  });

  it("런타임 코드에서 소유확인 meta 를 생성하지 않는다", () => {
    const provider = read("src/i18n/LocaleProvider.tsx");
    for (const name of [
      "google-adsense-account",
      "google-site-verification",
      "naver-site-verification"
    ]) {
      expect(provider.includes(name), name).toBe(false);
    }
  });
});

describe("정적 index.html — canonical / robots / OG", () => {
  const html = read("index.html");

  it("canonical 이 production 루트를 가리킨다", () => {
    const href = html.match(/<link[^>]*rel=["']canonical["'][^>]*>/i)?.[0];
    expect(href).toBeTruthy();
    expect(href!.match(/href=["']([^"']*)["']/i)?.[1]).toBe(DOMAIN);
  });

  it("robots meta 가 index,follow 를 포함한다", () => {
    const content = metaContent(html, "name", "robots")!;
    expect(content).toContain("index");
    expect(content).toContain("follow");
    expect(content).not.toContain("noindex");
  });

  it("og:url 이 production 루트이고 기본 locale 은 ko_KR 이다", () => {
    expect(metaContent(html, "property", "og:url")).toBe(DOMAIN);
    expect(metaContent(html, "property", "og:locale")).toBe("ko_KR");
    expect(metaContent(html, "property", "og:locale:alternate")).toBe("en_US");
  });

  it("OG/Twitter 공유 이미지는 production 절대 URL의 1200x630 PNG 를 사용한다", () => {
    const image = "https://mycore12.com/og-image.png";
    expect(metaContent(html, "property", "og:image")).toBe(image);
    expect(metaContent(html, "property", "og:image:width")).toBe("1200");
    expect(metaContent(html, "property", "og:image:height")).toBe("630");
    expect(metaContent(html, "property", "og:image:type")).toBe("image/png");
    expect(metaContent(html, "property", "og:image:alt")).toContain("MYCORE12");
    expect(metaContent(html, "name", "twitter:image")).toBe(image);
    expect(metaContent(html, "name", "twitter:image:alt")).toContain("MYCORE12");
    expect(existsSync(join(ROOT, "public/og-image.png"))).toBe(true);
  });

  it("crawlable 한 언어별 URL 이 없으므로 hreflang 을 만들지 않는다", () => {
    expect(/hreflang/i.test(html)).toBe(false);
  });
});

describe("JSON-LD 구조화 데이터", () => {
  const html = read("index.html");
  const raw = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
  )?.[1];

  it("JSON 으로 파싱된다", () => {
    expect(raw).toBeTruthy();
    expect(() => JSON.parse(raw!)).not.toThrow();
  });

  it("URL 이 production domain 과 일치한다", () => {
    const data = JSON.parse(raw!);
    const nodes = data["@graph"] as Record<string, unknown>[];
    expect(nodes.length).toBeGreaterThan(0);
    for (const n of nodes) {
      expect(n.url, String(n["@type"])).toBe(DOMAIN);
      expect(String(n["@id"]).startsWith(DOMAIN)).toBe(true);
    }
    expect(nodes.map(n => n["@type"])).toContain("WebSite");
    expect(nodes.map(n => n["@type"])).toContain("WebApplication");
  });

  it("확인되지 않은 주장을 포함하지 않는다", () => {
    for (const k of [
      "aggregateRating",
      "review",
      "ratingValue",
      "award",
      "offers",
      "price",
      "FAQPage",
      "MedicalEntity"
    ]) {
      expect(raw!.includes(k), k).toBe(false);
    }
  });
});

describe("정적 SEO 파일", () => {
  it("ads.txt 가 정확히 한 줄이고 BOM·주석이 없다", () => {
    const raw = readFileSync(join(ROOT, "public/ads.txt"));
    expect(raw[0]).not.toBe(0xef); // BOM 없음
    const lines = raw.toString("utf8").split("\n").filter(l => l.trim());
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(ADS_TXT_LINE);
    expect(raw.toString("utf8").includes("#")).toBe(false);
    expect(raw.toString("utf8").includes("<")).toBe(false);
  });

  it("robots.txt 가 모든 크롤러를 허용하고 sitemap 을 가리킨다", () => {
    const txt = read("public/robots.txt");
    expect(txt).toContain("User-agent: *");
    expect(txt).toContain("Allow: /");
    expect(txt).toContain("Sitemap: https://mycore12.com/sitemap.xml");
    // 특정 봇을 따로 차단하지 않는다
    expect(/Disallow:\s*\/\s*$/m.test(txt)).toBe(false);
    for (const bot of ["Googlebot", "Mediapartners-Google", "Yeti"]) {
      expect(txt.includes(`Disallow`) && txt.includes(bot)).toBe(false);
    }
  });

  it("sitemap.xml 이 루트 URL 만 담고 fragment 를 포함하지 않는다", () => {
    const xml = read("public/sitemap.xml");
    expect(xml.trimStart().startsWith("<?xml")).toBe(true);
    expect(xml).toContain("http://www.sitemaps.org/schemas/sitemap/0.9");
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    expect(locs).toEqual([DOMAIN]);
    expect(xml.includes("#/")).toBe(false);
  });
});

describe("AdSense 광고 코드는 아직 넣지 않는다", () => {
  const files = [
    "index.html",
    "src/main.tsx",
    "src/App.tsx",
    "src/pages/Home.tsx",
    "src/pages/How.tsx",
    "src/pages/Result.tsx",
    "src/pages/History.tsx",
    "src/pages/Assessment.tsx",
    "src/components/Chrome.tsx"
  ];

  it("광고 스크립트와 광고 unit 이 소스에 없다", () => {
    for (const f of files) {
      const src = read(f);
      expect(src.includes("adsbygoogle"), `${f}: adsbygoogle`).toBe(false);
      expect(src.includes("pagead2.googlesyndication"), `${f}: pagead2`).toBe(false);
      expect(src.includes("data-ad-slot"), `${f}: data-ad-slot`).toBe(false);
      expect(src.includes("data-ad-client"), `${f}: data-ad-client`).toBe(false);
    }
  });

  it("자체 쿠키 동의 배너를 구현하지 않는다 (Google CMP 사용 예정)", () => {
    for (const f of files) {
      const src = read(f);
      expect(/__tcfapi|consentBanner|cookieConsent/i.test(src), f).toBe(false);
    }
  });
});

describe("개인정보 안내의 광고·쿠키 설명", () => {
  const ko = JSON.parse(read("src/locales/ko/ui.json"));
  const en = JSON.parse(read("src/locales/en/ui.json"));
  const page = read("src/pages/How.tsx");

  it("ko/en 모두 광고 안내 key 를 갖는다", () => {
    for (const ui of [ko, en]) {
      for (const k of ["adsTitle", "p4", "p5", "p6", "linkPartnerSites", "linkAdCenter"]) {
        expect(String(ui.privacy[k]).trim().length, k).toBeGreaterThan(0);
      }
    }
  });

  it("현재 광고 쿠키를 쓰고 있다고 단정하지 않는다", () => {
    expect(ko.privacy.p4).toContain("앞으로");
    expect(en.privacy.p4).toContain("If Google AdSense");
  });

  it("검사 응답·결과를 광고 타기팅에 제공하지 않는다고 밝힌다", () => {
    expect(ko.privacy.p5).toContain("광고 타기팅");
    expect(en.privacy.p5).toContain("ad targeting");
  });

  it("Google 공식 안내 링크를 새 탭으로 연다", () => {
    expect(page).toContain("https://policies.google.com/technologies/partner-sites");
    expect(page).toContain("https://myadcenter.google.com/");
    expect(page).toContain('rel="noopener noreferrer"');
  });
});

describe("build:single 산출물", () => {
  const OUT = join(ROOT, "dist-single");
  // 빌드 산출물이 없으면(테스트만 단독 실행) 이 그룹은 건너뛴다
  const built = existsSync(join(OUT, "index.html"));

  it.runIf(built)("배포에 필요한 7개 파일이 모두 있다", () => {
    for (const f of [
      "index.html",
      "404.html",
      "ads.txt",
      "robots.txt",
      "sitemap.xml",
      "og-image.png",
      ".nojekyll"
    ]) {
      expect(existsSync(join(OUT, f)), f).toBe(true);
    }
  });

  it.runIf(built)("index.html / 404.html 에 소유확인 meta 가 남아 있다", () => {
    for (const f of ["index.html", "404.html"]) {
      const html = readFileSync(join(OUT, f), "utf8");
      expect(metaContent(html, "name", "google-adsense-account"), f).toBe(ADSENSE_PUB);
      expect(metaContent(html, "name", "google-site-verification"), f).toBe(GSC);
      expect(metaContent(html, "name", "naver-site-verification"), f).toBe(NAVER);
      expect(html.includes(DOMAIN), f).toBe(true);
    }
  });

  it.runIf(built)("빌드된 정적 파일 내용이 원본과 같다", () => {
    for (const f of ["ads.txt", "robots.txt", "sitemap.xml"]) {
      expect(readFileSync(join(OUT, f), "utf8"), f).toBe(read(`public/${f}`));
    }
    expect(readFileSync(join(OUT, "og-image.png")), "og-image.png").toEqual(
      readFileSync(join(ROOT, "public/og-image.png"))
    );
  });

  it.runIf(built)("번들에 광고 스크립트가 들어가지 않는다", () => {
    const html = readFileSync(join(OUT, "index.html"), "utf8");
    expect(html.includes("pagead2.googlesyndication")).toBe(false);
    expect(html.includes('class="adsbygoogle"')).toBe(false);
  });
});

describe("build:single 스크립트", () => {
  it("SEO 파일을 KEEP 하고 누락 시 빌드를 실패시킨다", () => {
    const script = read("scripts/build-single.mjs");
    for (const f of ["ads.txt", "robots.txt", "sitemap.xml", "og-image.png"]) {
      expect(script.includes(f), f).toBe(true);
    }
    expect(script).toContain("배포 산출물 누락");
  });

  it("HashRouter 배포 구조를 유지한다", () => {
    const script = read("scripts/build-single.mjs");
    expect(script).toContain('VITE_ROUTER: "hash"');
    expect(script).toContain('VITE_SINGLE: "1"');
  });
});
