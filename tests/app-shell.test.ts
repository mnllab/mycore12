/**
 * App-like interaction 검수.
 *
 * 목표는 "브라우저 기능을 막은 웹사이트"가 아니라 "정돈된 앱 같은 UX"이므로,
 * 적용한 것뿐 아니라 **적용하지 않아야 할 것**도 함께 잠근다.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const css = readFileSync(join(ROOT, "src/styles/global.css"), "utf8");
const indexHtml = readFileSync(join(ROOT, "index.html"), "utf8");
const manifest = JSON.parse(
  readFileSync(join(ROOT, "public/manifest.webmanifest"), "utf8")
);
const assessment = readFileSync(join(ROOT, "src/pages/Assessment.tsx"), "utf8");
const result = readFileSync(join(ROOT, "src/pages/Result.tsx"), "utf8");

describe("text selection 범위", () => {
  it("검사 UI 는 선택되지 않고 결과 본문은 선택된다", () => {
    expect(css).toMatch(/\.assessment-screen[\s\S]{0,400}?user-select:\s*none/);
    expect(css).toMatch(/\.result-content[\s\S]{0,400}?user-select:\s*text/);
  });

  it("body 전체에 user-select:none 을 걸지 않는다", () => {
    expect(/body\s*\{[^}]*user-select:\s*none/.test(css)).toBe(false);
  });

  it("검사 화면과 결과 화면에 해당 클래스가 실제로 붙어 있다", () => {
    expect(assessment).toContain('className="assessment-screen"');
    expect(result).toContain('className="result-content page-enter"');
  });
});

describe("touch / tap 처리", () => {
  it("tap highlight 를 제거한다", () => {
    expect(css).toMatch(/html\s*\{[^}]*-webkit-tap-highlight-color:\s*transparent/);
    expect(css).toMatch(/button[^{]*\{[^}]*-webkit-tap-highlight-color:\s*transparent/);
  });

  it("검사 화면에서 iOS 복사 callout 을 막는다", () => {
    expect(css).toMatch(/\.assessment-screen button[\s\S]{0,300}?-webkit-touch-callout:\s*none/);
  });

  it("touch-action 은 manipulation 만 쓰고 body 에 none 을 걸지 않는다", () => {
    expect(css).toContain("touch-action: manipulation");
    expect(/(body|html)\s*\{[^}]*touch-action:\s*none/.test(css)).toBe(false);
  });

  it("press 축소는 0.97 미만으로 내려가지 않는다", () => {
    const scales = [...css.matchAll(/transform:\s*scale\(([\d.]+)\)/g)].map(m =>
      Number(m[1])
    );
    expect(scales.length).toBeGreaterThan(0);
    for (const s of scales) expect(s).toBeGreaterThanOrEqual(0.97);
  });

  it("hover 효과는 hover 가능한 기기에서만 적용한다", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    const bare = [...css.matchAll(/^\.(v-actions button|v-mid|length-card):hover/gm)];
    expect(bare).toHaveLength(0);
  });
});

describe("viewport / overscroll / safe area", () => {
  it("dvh 로 모바일 주소창 높이 변화를 흡수한다", () => {
    expect(css).toContain("min-height: 100dvh");
  });

  it("overscroll bounce 와 가로 흔들림을 막는다", () => {
    expect(css).toMatch(/html\s*\{[^}]*overscroll-behavior-y:\s*none/);
    expect(css).toMatch(/overflow-x:\s*(hidden|clip)/);
  });

  it("safe area 를 확보한다", () => {
    expect(css).toContain("env(safe-area-inset-top)");
    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(css).toMatch(/calc\(20px \+ env\(safe-area-inset-bottom\)\)/);
    expect(indexHtml).toContain("viewport-fit=cover");
  });

  it("확대 기능을 막지 않는다 (접근성)", () => {
    expect(indexHtml).not.toContain("user-scalable=no");
    expect(indexHtml).not.toContain("maximum-scale=1");
  });
});

describe("focus 접근성", () => {
  it("키보드 focus 는 남기고 마우스 focus outline 만 없앤다", () => {
    expect(css).toMatch(/:focus\s*\{\s*outline:\s*none;\s*\}/);
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid/);
  });
});

describe("motion", () => {
  it("화면 전환과 문항 전환은 250ms 이하로 짧다", () => {
    const page = css.match(/\.page-enter\s*\{[^}]*animation:\s*page-enter (\d+)ms/);
    const q = css.match(/\.q-card\.page-enter\s*\{[^}]*animation:\s*q-enter (\d+)ms/);
    expect(Number(page?.[1])).toBeLessThanOrEqual(250);
    expect(Number(q?.[1])).toBeLessThanOrEqual(180);
  });

  it("prefers-reduced-motion 을 존중한다", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});

describe("PWA", () => {
  it("manifest 가 새 Primary 색상과 standalone 을 사용한다", () => {
    expect(manifest.display).toBe("standalone");
    expect(manifest.background_color).toBe("#f8f9fa");
    expect(manifest.theme_color).toBe("#3f4d5f");
    expect(manifest.short_name).toBe("마이코어12");
    // 아이콘은 기존 공식 asset 만 사용한다 (새 로고를 만들지 않는다)
    expect(manifest.icons.every((i: { src: string }) => i.src.includes("brand-mark"))).toBe(
      true
    );
  });

  it("모바일 웹앱 meta 가 현재 지원 기준으로 구성돼 있다", () => {
    expect(indexHtml).toContain('name="theme-color" content="#3f4d5f"');
    expect(indexHtml).toContain('name="mobile-web-app-capable"');
    expect(indexHtml).toContain('name="apple-mobile-web-app-status-bar-style"');
  });
});

describe("문항 전환", () => {
  it("문항이 바뀌면 스크롤을 상단으로 되돌린다", () => {
    expect(assessment).toMatch(/useEffect\([\s\S]{0,400}?window\.scrollTo[\s\S]{0,200}?\[q\.id\]\)/);
  });

  it("동작 줄이기 설정에서는 부드러운 스크롤을 쓰지 않는다", () => {
    expect(assessment).toContain('prefers-reduced-motion: reduce');
    expect(assessment).toMatch(/behavior:\s*reduce \? "auto" : "smooth"/);
  });
});
