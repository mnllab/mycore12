/**
 * 디자인 가드레일 — MYCORE12_UI_DESIGN_SYSTEM.md 위반을 회귀 방지한다.
 * (기능 로직은 검사하지 않는다)
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const css = readFileSync(join(ROOT, "src/styles/global.css"), "utf8");
const walk = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap(n => {
    const rel = `${dir}/${n}`;
    return statSync(join(ROOT, rel)).isDirectory()
      ? walk(rel)
      : /\.tsx$/.test(n)
      ? [rel]
      : [];
  });
const tsx = [...walk("src/pages"), ...walk("src/components")]
  .map(f => readFileSync(join(ROOT, f), "utf8"))
  .join("\n");

describe("금지 스타일", () => {
  it("glassmorphism(backdrop-filter)을 쓰지 않는다", () => {
    expect(css.includes("backdrop-filter")).toBe(false);
  });

  it("neon glow / 강한 그림자 효과를 쓰지 않는다", () => {
    expect(/text-shadow/.test(css)).toBe(false);
    expect(/drop-shadow/.test(css)).toBe(false);
    // blur는 배경 radial gradient에도 쓰지 않는다 (filter: blur 금지)
    expect(/filter:\s*blur/.test(css)).toBe(false);
  });

  it("보라색 계열 gradient를 배경에 쓰지 않는다", () => {
    const gradients = css.match(/gradient\([^;]*\)/g) ?? [];
    for (const g of gradients) {
      // 배경 그라디언트는 graphite(rgba(37,50,56,...)) 계열만 허용
      expect(/purple|violet|#[89a-f][0-9a-f]{2}f/i.test(g), g).toBe(false);
      expect(/rgba\(37,\s*50,\s*56/.test(g), g).toBe(true);
    }
    expect(gradients.length).toBeLessThanOrEqual(3);
  });

  it("배경 gradient 불투명도가 매우 낮게 유지된다", () => {
    const alphas = [...css.matchAll(/rgba\(37,\s*50,\s*56,\s*([\d.]+)\)/g)].map(m =>
      Number(m[1])
    );
    for (const a of alphas) expect(a).toBeLessThanOrEqual(0.1);
  });

  it("과도한 bold를 쓰지 않는다 (font-weight 700 이상 없음)", () => {
    const weights = [...css.matchAll(/font-weight:\s*(\d{3})/g)].map(m => Number(m[1]));
    expect(weights.length).toBeGreaterThan(0);
    expect(Math.max(...weights)).toBeLessThan(700);
  });

  it("emoji를 UI에 쓰지 않는다", () => {
    expect(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(tsx)).toBe(false);
  });
});

describe("한국어 타이포그래피", () => {
  it("단어 중간 줄바꿈을 막는 keep-all을 적용한다", () => {
    expect(css).toContain("word-break: keep-all");
  });

  it("본문 line-height가 1.7 이상이다", () => {
    expect(/body\s*\{[^}]*line-height:\s*1\.7/.test(css)).toBe(true);
  });

  it("읽기 폭(measure)을 제한한다", () => {
    expect(css).toContain("--reading-max");
    expect(/max-width:\s*3[0-9]em/.test(css)).toBe(true);
  });
});

describe("결과 화면 리듬", () => {
  it("모든 섹션을 동일한 둥근 카드로 구성하지 않는다", () => {
    // 카드형(.panel/.dev-module/.callout) 반복 패턴이 제거되었는지 확인
    expect(tsx.includes('className="panel"')).toBe(false);
    expect(tsx.includes('className="dev-module"')).toBe(false);
    expect(tsx.includes('className="callout"')).toBe(false);
  });

  it("서로 다른 레이아웃 유형을 섞어 쓴다", () => {
    for (const layout of ["enum-list", "split-edit", "accordion", "roadmap", "quotes"]) {
      expect(tsx.includes(layout), layout).toBe(true);
    }
  });

  it("섹션 번호 라벨(eyebrow)로 위계를 만든다", () => {
    expect(tsx).toContain("eyebrow");
    expect(css).toContain(".eyebrow");
  });
});

describe("12에너지 시각화 규칙", () => {
  const map = readFileSync(join(ROOT, "src/components/EnergyMap.tsx"), "utf8");

  it("면적 채우기 금지 — 모든 polygon이 fill=none", () => {
    const fills = [...map.matchAll(/<polygon[\s\S]*?fill="([^"]+)"/g)].map(m => m[1]);
    expect(fills.length).toBeGreaterThan(0);
    for (const f of fills) expect(f).toBe("none");
  });

  it("고정 외곽 프레임과 50 기준선이 있다", () => {
    expect(map).toContain("rOuter");
    expect(map).toContain("r50");
    expect(/>\s*50\s*</.test(map)).toBe(true); // 50 기준선 라벨
  });

  it("면적값을 계산하거나 표시하지 않는다", () => {
    // 면적/넓이를 산출하는 연산이나 표시가 없어야 한다 (접근성 설명문의 부정 서술은 제외)
    const code = map.replace(/<desc[\s\S]*?<\/desc>/g, "");
    expect(/\bareaOf|polygonArea|계산한 면적|면적\s*=/.test(code)).toBe(false);
    expect(/fill="var\(/.test(code.match(/<polygon[\s\S]*?\/>/g)?.join("") ?? "")).toBe(false);
  });
});

describe("반응형 안전장치", () => {
  it("SVG가 컨테이너를 넘지 않는다 (320~430px 및 1024px 가로 overflow 방지)", () => {
    expect(/\.map-panel svg \{[^}]*max-width:\s*100%/.test(css)).toBe(true);
    expect(/\.hero-orbit svg \{[^}]*max-width:\s*400px/.test(css)).toBe(true);
  });

  it("grid 자식에 min-width:0을 주어 긴 문장이 컬럼을 밀지 않는다", () => {
    expect(css).toContain(".result-hero .inner > * { min-width: 0; }");
    expect(css).toContain(".hero .inner > * { min-width: 0; }");
  });

  it("터치 타깃이 최소 48px 이상이다", () => {
    expect(/\.btn \{[^}]*min-height:\s*5\dpx/.test(css)).toBe(true);
    expect(/\.btn-quiet \{[^}]*min-height:\s*48px/.test(css)).toBe(true);
    expect(/\.scale button \{[^}]*min-height:\s*7\dpx/.test(css)).toBe(true);
  });

  it("가로 스크롤을 차단한다", () => {
    expect(/body \{[^}]*overflow-x:\s*hidden/.test(css)).toBe(true);
  });

  it("reduced-motion을 지원한다", () => {
    expect(css).toContain("prefers-reduced-motion");
  });
});

describe("배포 설정", () => {
  it("SPA fallback 설정이 빌드 산출물과 호스팅 설정에 포함된다", () => {
    // 딥링크(/result/:id) 새로고침 시 404가 나지 않도록 하는 필수 설정
    expect(readFileSync(join(ROOT, "public/_redirects"), "utf8")).toContain("/index.html");
    expect(readFileSync(join(ROOT, "public/.htaccess"), "utf8")).toContain("RewriteRule . /index.html");
    const vercel = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
    expect(vercel.rewrites[0].destination).toBe("/index.html");
    const netlify = readFileSync(join(ROOT, "netlify.toml"), "utf8");
    expect(netlify).toContain("status = 200");
  });

  it("환경변수 없이 동작한다 (import.meta.env 의존 없음)", () => {
    expect(/import\.meta\.env/.test(tsx)).toBe(false);
  });
});

describe("하위 경로 배포 (GitHub Pages 등)", () => {
  it("vite base 를 환경변수로 지정할 수 있다", () => {
    const cfg = readFileSync(join(ROOT, "vite.config.ts"), "utf8");
    expect(cfg).toContain("VITE_BASE");
    expect(cfg).toMatch(/base,?\s*\n?\s*plugins|base:/);
  });

  it("라우터 basename 이 빌드 base 와 연동된다", () => {
    const main = readFileSync(join(ROOT, "src/main.tsx"), "utf8");
    expect(main).toContain("basename={import.meta.env.BASE_URL}");
  });

  it("index.html 의 브랜드 에셋이 base 치환자를 사용한다", () => {
    const html = readFileSync(join(ROOT, "index.html"), "utf8");
    expect(html).toContain('href="%BASE_URL%manifest.webmanifest"');
    expect(html).toContain('href="%BASE_URL%brand-mark.svg"');
    // 절대경로 하드코딩이 남아 있으면 하위 경로 배포에서 404가 난다
    expect(html.includes('href="/brand-mark.svg"')).toBe(false);
    expect(html.includes('content="/brand-mark.svg"')).toBe(false);
  });

  it("manifest 가 상대 경로를 사용한다", () => {
    const mf = JSON.parse(readFileSync(join(ROOT, "public/manifest.webmanifest"), "utf8"));
    expect(mf.start_url).toBe("./");
    expect(mf.scope).toBe("./");
    expect(mf.icons[0].src).toBe("./brand-mark.svg");
  });

  it("GitHub Pages 빌드 스크립트가 404 fallback 과 .nojekyll 을 만든다", () => {
    const script = readFileSync(join(ROOT, "scripts/build-gh.mjs"), "utf8");
    expect(script).toContain("404.html");
    expect(script).toContain(".nojekyll");
    expect(script).toContain("VITE_BASE");
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(pkg.scripts["build:gh"]).toBe("node scripts/build-gh.mjs");
  });
});
