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
    // 400·500·600·700 만 사용한다 (900 black weight 금지)
    expect(Math.max(...weights)).toBeLessThanOrEqual(700);
    for (const w of weights) expect([400, 500, 600, 700]).toContain(w);
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
    expect(css).toContain("--width-reading");
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
    expect(/\.hero-orbit svg \{[^}]*max-width:\s*\d+px/.test(css)).toBe(true);
  });

  it("grid 자식에 min-width:0을 주어 긴 문장이 컬럼을 밀지 않는다", () => {
    expect(css).toContain(".result-hero .inner > * { min-width: 0; }");
    expect(css).toContain(".hero .inner > * { min-width: 0; }");
  });

  it("터치 타깃이 충분히 크다", () => {
    expect(/\.btn \{[^}]*min-height:\s*50px/.test(css)).toBe(true);
    expect(/\.btn-text \{[^}]*min-height:\s*44px/.test(css)).toBe(true);
    // 문항 응답 컨트롤 (좌우 척도 / 세로 강도 버튼 / 중립 버튼)
    expect(/\.scale-h button \{[^}]*min-height:\s*6\dpx/.test(css)).toBe(true);
    expect(/\.v-actions button \{[^}]*min-height:\s*4[6-9]px/.test(css)).toBe(true);
    expect(/\.v-mid \{[^}]*min-height:\s*4[2-9]px/.test(css)).toBe(true);
    // 하단 이전/다음 문항 버튼
    expect(/\.assess-nav-steps \.btn-text \{[^}]*min-height:\s*44px/.test(css)).toBe(true);
    // 검사 길이 선택 카드
    expect(/\.length-card \{[^}]*min-height:\s*44px/.test(css)).toBe(true);
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

  it("라우터가 base 와 연동되고 hash 모드를 지원한다", () => {
    const main = readFileSync(join(ROOT, "src/main.tsx"), "utf8");
    expect(main).toContain("HashRouter");
    expect(main).toContain('VITE_ROUTER === "hash"');
    expect(main).toContain("basename: import.meta.env.BASE_URL");
  });

  it("index.html 의 브랜드 에셋이 base 치환자를 사용한다", () => {
    const html = readFileSync(join(ROOT, "index.html"), "utf8");
    expect(html).toContain('href="%BASE_URL%manifest.webmanifest"');
    expect(html).toContain('href="%BASE_URL%brand-mark.svg"');
    // 절대경로 하드코딩이 남아 있으면 하위 경로 배포에서 404가 난다
    expect(html.includes('href="/brand-mark.svg"')).toBe(false);
    expect(html.includes('content="/brand-mark.svg"')).toBe(false);
  });

  it("빌드 산출물의 에셋 경로가 절대경로다 (배포 후 흰 화면 방지)", () => {
    let html: string;
    try {
      html = readFileSync(join(ROOT, "dist/index.html"), "utf8");
    } catch {
      return; // dist 가 없으면 건너뛴다 (테스트 전용 환경)
    }
    const refs = [...html.matchAll(/(?:src|href)="([^"]*assets\/[^"]*)"/g)].map(m => m[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) {
      expect(r.startsWith("/"), `상대경로 에셋: ${r}`).toBe(true);
    }
  });

  it("manifest 가 상대 경로를 사용한다", () => {
    const mf = JSON.parse(readFileSync(join(ROOT, "public/manifest.webmanifest"), "utf8"));
    expect(mf.start_url).toBe("./");
    expect(mf.scope).toBe("./");
    expect(mf.icons[0].src).toBe("./brand-mark.svg");
  });

  it("GitHub Pages 빌드가 절대 base + hash 라우터 + 404 리다이렉트를 쓴다", () => {
    const script = readFileSync(join(ROOT, "scripts/build-gh.mjs"), "utf8");
    expect(script).toContain("404.html");
    expect(script).toContain(".nojekyll");
    // 상대경로("./")는 진입 URL 깊이에 따라 에셋 위치가 달라져 흰 화면이 된다.
    // 반드시 "/<저장소>/" 절대경로를 써야 한다.
    expect(script).toContain("VITE_BASE: base");
    expect(script).toContain("const base = `/${repo}/`");
    expect(script.includes('VITE_BASE: "./"')).toBe(false);
    expect(script).toContain('VITE_ROUTER: "hash"');
    // 404.html 은 index.html 복사본이 아니라 base 로 보내는 리다이렉트여야 한다
    expect(script).toContain("location.replace(base + hash)");
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(pkg.scripts["build:gh"]).toBe("node scripts/build-gh.mjs");
  });
});

describe("디자인 토큰 체계", () => {
  it("지정된 컬러 토큰이 정의되어 있다", () => {
    const tokens: [string, string][] = [
      ["--color-bg", "#f8f9fa"],
      ["--color-surface", "#ffffff"],
      ["--color-text", "#1f2937"],
      ["--color-text-secondary", "#64748b"],
      // 2026-08-29 Primary 를 채도 낮은 Dark Gray Blue 계열로 교체
      ["--color-primary", "#3f4d5f"],
      ["--color-primary-hover", "#334155"],
      ["--color-primary-active", "#293545"],
      ["--color-primary-soft", "#eef1f4"],
      ["--color-slate", "#475569"],
      ["--color-border", "#e2e6ea"],
      ["--color-border-strong", "#cbd5e1"]
    ];
    for (const [name, value] of tokens) {
      expect(new RegExp(`${name}:\\s*${value}`, "i").test(css), name).toBe(true);
    }
  });

  it("컴포넌트에 컬러를 하드코딩하지 않는다", () => {
    // 흰색·투명 외의 raw hex 가 컴포넌트에 직접 들어가면 안 된다
    const hexes = [...tsx.matchAll(/#[0-9a-fA-F]{3,8}/g)].map(m => m[0].toLowerCase());
    for (const h of hexes) expect(["#fff", "#ffffff"], `하드코딩 색상 ${h}`).toContain(h);
  });

  it("radius 가 지정된 스케일 안에서만 쓰인다", () => {
    const radii = [...css.matchAll(/border-radius:\s*([^;]+);/g)].map(m => m[1].trim());
    const allowed = [
      "var(--radius-sm)", "var(--radius-btn)", "var(--radius-card)", "var(--radius-lg)",
      "16px", // 검사 길이 선택 카드
      "50%", "999px", "2px", "4px"
    ];
    for (const r of radii) expect(allowed, `허용되지 않은 radius: ${r}`).toContain(r);
  });

  it("shadow 를 카드에 쓰지 않고 지정된 값만 정의한다", () => {
    const shadows = [...css.matchAll(/box-shadow:\s*([^;]+);/g)].map(m => m[1].trim());
    for (const s of shadows) {
      // 허용: focus ring(soft), 정의된 float/modal 토큰, marker outline
      expect(
        // 카드 그림자는 아주 옅은 것 하나만 허용 (검사 길이 선택 카드)
        /var\(--shadow-|0 0 0 \d+px|^0 6px 20px rgba\(15, 23, 42, 0\.04\)$/.test(s),
        `허용되지 않은 shadow: ${s}`
      ).toBe(true);
    }
  });

  it("문항 선택지 두 카드가 동일한 스타일 규칙을 공유한다", () => {
    // .choice-card / .v-card 에 nth-child 나 first/last 로 한쪽만 다르게 주지 않는다
    expect(/\.choice-card:(first|last|nth)/.test(css)).toBe(false);
    expect(/\.v-card:(first|last|nth)/.test(css)).toBe(false);
  });

  it("문항 화면에 상황 라벨(측정 힌트)을 노출하지 않는다", () => {
    const assess = readFileSync(join(ROOT, "src/pages/Assessment.tsx"), "utf8");
    expect(assess.includes("contextLabel")).toBe(false);
  });

  it("아이콘 시스템이 하나이고 stroke 가 통일되어 있다", () => {
    const icons = readFileSync(join(ROOT, "src/components/icons.tsx"), "utf8");
    expect(icons).toContain("strokeWidth: 1.75");
    expect((icons.match(/strokeWidth/g) ?? []).length).toBe(1);
    // 컴포넌트가 외부 아이콘 라이브러리를 쓰지 않는다
    expect(/from ["']lucide|react-icons|@heroicons/.test(tsx)).toBe(false);
  });

  it("선택 상태를 색상만으로 표현하지 않는다 (체크 인디케이터 병행)", () => {
    const assess = readFileSync(join(ROOT, "src/pages/Assessment.tsx"), "utf8");
    expect(assess).toContain('<Check className="check"');
    expect((assess.match(/<Check className="check"/g) ?? []).length).toBe(2);
    expect(css).toContain(".choice-card.lean .check");
  });
});
