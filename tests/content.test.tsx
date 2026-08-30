/**
 * 렌더 단위 최종 QA.
 * 실제 DOM을 그려 브랜드 표기, 결과 본문 누락, 접근성, 콘솔 오류를 확인한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LocaleProvider } from "../src/i18n/LocaleProvider";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";

// 뷰포트 전환을 제어하기 위한 matchMedia 스텁
const MATCH_WIDE = true;
Object.defineProperty(globalThis, "matchMedia", {
  configurable: true,
  writable: true,
  value: (q: string) => ({
    matches: q.includes("min-width: 700px") ? MATCH_WIDE : !MATCH_WIDE,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {}
  })
});
// jsdom은 window.scrollTo를 구현하지 않는다 (브라우저에서는 정상 동작)
Object.defineProperty(globalThis, "scrollTo", { configurable: true, value: () => {} });

// localStorage 스텁 (jsdom 기본 구현 대신 결정적으로 통제)
const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear()
  }
});

const App = (await import("../src/App")).default;
const storage = await import("../src/lib/storage");

// 기존 브랜드가 화면에 남아 있으면 안 된다 (MYCORE12 안의 CORE12는 제외)

let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  store.clear();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  const errs = errorSpy.mock.calls.filter(
    c => !String(c[0]).includes("not wrapped in act")
  );
  expect(errs, `console.error: ${JSON.stringify(errs)}`).toHaveLength(0);
  errorSpy.mockRestore();
  warnSpy.mockRestore();
  cleanup();
});

const renderAt = (path: string) =>
  render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </LocaleProvider>
  );

const buildResult = (answerValue: 1 | 2 | 3 | 4 | 5) => {
  const s = storage.startNewSession();
  for (const q of storage.questionsOf(s)) s.answers[q.id] = answerValue;
  return storage.completeSession(s);
};

/**
 * 다국어 기반 구조 검수 (Stage 1).
 *
 * 핵심 원칙
 *  - 기본 locale 은 ko, 브라우저 언어 자동 감지 없음
 *  - locale 은 표시 전용 — 세션·응답·채점에 절대 관여하지 않는다
 *  - 내부 한국어 에너지 key 는 표시명이 바뀌어도 그대로 유지된다
 */

const koPublic = (await import("../src/locales/ko/publicContent.json")).default;
const enPublic = (await import("../src/locales/en/publicContent.json")).default;
const koStories = (await import("../src/locales/ko/stories.json")).default;
const enStories = (await import("../src/locales/en/stories.json")).default;

const SLUGS = koStories.articles.map(a => a.slug);
const ROUTES = ["/about", "/energies", "/how", "/guide", "/stories"];

/** 중첩 객체의 leaf key path 수집 */
const leafPaths = (value: unknown, prefix = ""): string[] => {
  if (Array.isArray(value)) return value.flatMap((v, i) => leafPaths(v, `${prefix}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      leafPaths(v, prefix ? `${prefix}.${k}` : k)
    );
  }
  return [prefix];
};

describe("공개 콘텐츠 리소스 구조", () => {
  it("ko/en publicContent 의 leaf key 구조가 같다", () => {
    expect(leafPaths(enPublic).sort()).toEqual(leafPaths(koPublic).sort());
  });

  it("ko/en stories 의 leaf key 구조가 같다", () => {
    expect(leafPaths(enStories).sort()).toEqual(leafPaths(koStories).sort());
  });

  it("승인된 8개 slug 가 ko/en 모두 같은 순서로 존재한다", () => {
    expect(SLUGS).toHaveLength(8);
    expect(enStories.articles.map(a => a.slug)).toEqual(SLUGS);
    expect(new Set(SLUGS).size).toBe(8);
  });

  it("모든 글에 필수 필드가 채워져 있다", () => {
    for (const src of [koStories, enStories]) {
      for (const a of src.articles) {
        for (const f of ["title", "deck", "reflection", "seoTitle", "seoDescription"] as const) {
          expect(String(a[f]).trim().length, `${a.slug}.${f}`).toBeGreaterThan(0);
        }
        expect(a.body.length, `${a.slug}.body`).toBeGreaterThanOrEqual(4);
        for (const p of a.body) expect(p.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("영어 공개 콘텐츠에 한국어가 남지 않는다 (에너지 note 는 내부 key 로 조회)", () => {
    const strip = JSON.stringify(enPublic.energies.notes);
    const rest = JSON.stringify(enPublic).split(strip).join("");
    expect(rest.match(/[가-힣]+/g) ?? []).toEqual([]);
    expect(JSON.stringify(enStories).match(/[가-힣]+/g) ?? []).toEqual([]);
  });

  it("공식 영문 에너지·축 이름을 축약 없이 사용한다", () => {
    const text = JSON.stringify(enPublic);
    for (const n of ["Initiative", "Deliberation", "Coordination", "Autonomy",
                     "Creativity", "Practicality", "Analysis", "Integration",
                     "Empathy", "Clarity", "Structure", "Flexibility"]) {
      expect(text.includes(n), n).toBe(true);
    }
    for (const bad of ["Delib.", "Coord.", "Integr.", "Flex."]) {
      expect(text.includes(bad), bad).toBe(false);
    }
  });

  it("근거를 넘어선 표현을 쓰지 않는다", () => {
    const all = JSON.stringify(enPublic) + JSON.stringify(enStories);
    for (const w of ["scientifically proven", "clinically validated", "diagnostic tool",
                     "cures", "treatment for"]) {
      expect(all.toLowerCase().includes(w.toLowerCase()), w).toBe(false);
    }
  });
});

describe("공개 콘텐츠 페이지 렌더", () => {
  for (const locale of ["ko", "en"] as const) {
    const pub = locale === "ko" ? koPublic : enPublic;
    const st = locale === "ko" ? koStories : enStories;

    it(`${locale}: 정보 페이지 5개가 정상 렌더된다`, () => {
      for (const route of ROUTES) {
        store.clear();
        store.set("mycore12.locale.v1", locale);
        const { container, unmount } = renderAt(route);
        const text = container.textContent!;
        expect(container.querySelector("h1"), `${locale} ${route} h1`).not.toBeNull();
        if (route === "/about") expect(text).toContain(pub.about.title);
        if (route === "/energies") expect(text).toContain(pub.energies.title);
        if (route === "/how") expect(text).toContain(pub.how.title);
        if (route === "/guide") expect(text).toContain(pub.guide.title);
        if (route === "/stories") expect(text).toContain(st.hub.title);
        unmount();
      }
    });

    it(`${locale}: 8개 story slug 가 모두 본문까지 렌더된다`, () => {
      for (const slug of SLUGS) {
        store.clear();
        store.set("mycore12.locale.v1", locale);
        const article = st.articles.find(a => a.slug === slug)!;
        const { container, unmount } = renderAt(`/stories/${slug}`);
        const text = container.textContent!;
        expect(text, `${locale} ${slug} title`).toContain(article.title);
        expect(text, `${locale} ${slug} deck`).toContain(article.deck);
        for (const p of article.body) {
          expect(text, `${locale} ${slug} body`).toContain(p);
        }
        expect(text, `${locale} ${slug} reflection`).toContain(article.reflection);
        expect(text).toContain(st.labels.reflection);
        unmount();
      }
    });

    it(`${locale}: /energies 에 12개 에너지와 오늘의 문장이 모두 나온다`, () => {
      store.set("mycore12.locale.v1", locale);
      const { container } = renderAt("/energies");
      const text = container.textContent!;
      for (const axis of pub.energies.axes) {
        expect(text, axis.a.name).toContain(axis.a.name);
        expect(text, axis.b.name).toContain(axis.b.name);
        expect(text).toContain(axis.together);
      }
      // 일반 안내임을 명시한다 (개인화된 메시지처럼 보이지 않게)
      expect(text).toContain(pub.energies.noteDisclaimer);
    });
  }

  it("English 정보 페이지에 한국어가 남지 않는다", () => {
    const stripAllowed = (s: string) => s.split("한국어").join("");
    for (const route of [...ROUTES, ...SLUGS.map(s => `/stories/${s}`)]) {
      store.clear();
      store.set("mycore12.locale.v1", "en");
      const { container, unmount } = renderAt(route);
      const found = stripAllowed(container.textContent!).match(/[가-힣]+/g) ?? [];
      expect(found, `${route}: ${found.join(", ")}`).toEqual([]);
      unmount();
    }
  });

  it("locale 을 바꿔도 같은 story slug 에 머무른다", () => {
    const slug = "use-strengths-wider";
    store.set("mycore12.locale.v1", "ko");
    const ko = renderAt(`/stories/${slug}`);
    expect(ko.container.textContent).toContain(
      koStories.articles.find(a => a.slug === slug)!.title
    );
    cleanup();

    store.set("mycore12.locale.v1", "en");
    const en = renderAt(`/stories/${slug}`);
    expect(en.container.textContent).toContain(
      enStories.articles.find(a => a.slug === slug)!.title
    );
  });
});

describe("탐색 구조와 결과 연결", () => {
  it("푸터에 소개·12에너지·검사 원리·활용 가이드·읽을거리가 모두 있다", () => {
    for (const locale of ["ko", "en"] as const) {
      store.clear();
      store.set("mycore12.locale.v1", locale);
      const { container, unmount } = renderAt("/");
      const hrefs = [...container.querySelectorAll(".site-footer .links a")].map(a =>
        a.getAttribute("href")
      );
      for (const path of ["/about", "/energies", "/how", "/guide", "/stories"]) {
        expect(hrefs.some(h => h?.includes(path)), `${locale} ${path}`).toBe(true);
      }
      unmount();
    }
  });

  it("Home 에 읽을거리 티저 3편(01·02·08)이 있다", () => {
    const { container } = renderAt("/");
    const text = container.textContent!;
    for (const slug of ["strengths-already-here", "slow-is-still-moving", "one-small-step"]) {
      const a = koStories.articles.find(x => x.slug === slug)!;
      expect(text, slug).toContain(a.title);
    }
    // 검사 CTA 와 길이 선택은 그대로 유지된다
    expect(screen.getByRole("button", { name: "검사 시작" })).toBeTruthy();
    expect(container.querySelectorAll(".length-card")).toHaveLength(4);
  });

  it("결과 화면 하단에 보조 읽을거리가 붙고 해석보다 뒤에 온다", () => {
    const stored = buildResult(2);
    const { container } = renderAt(`/result/${stored.sessionId}`);
    const reading = container.querySelector(".result-reading")!;
    expect(reading).not.toBeNull();
    expect(reading.querySelectorAll(".story-mini")).toHaveLength(2);
    for (const slug of ["strengths-already-here", "use-strengths-wider"]) {
      const a = koStories.articles.find(x => x.slug === slug)!;
      expect(reading.textContent).toContain(a.title);
    }
    // 결과 해석(핵심 특징)이 읽을거리보다 앞에 있어야 한다
    const core = container.querySelector("#core")!;
    expect(
      core.compareDocumentPosition(reading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

describe("route 별 metadata", () => {
  it("경로와 locale 에 맞는 title/description 을 적용한다", () => {
    document.head.innerHTML = '<meta name="description" content="" />';
    const get = () => document.querySelector('meta[name="description"]')!.getAttribute("content");

    store.set("mycore12.locale.v1", "ko");
    const about = renderAt("/about");
    expect(document.title).toBe(koPublic.meta.about.title);
    expect(get()).toBe(koPublic.meta.about.description);
    about.unmount();
    cleanup();

    store.set("mycore12.locale.v1", "en");
    const guide = renderAt("/guide");
    expect(document.title).toBe(enPublic.meta.guide.title);
    guide.unmount();
    cleanup();

    const article = koStories.articles[0];
    store.set("mycore12.locale.v1", "ko");
    renderAt(`/stories/${article.slug}`);
    expect(document.title).toBe(article.seoTitle);
    expect(get()).toBe(article.seoDescription);
  });
});

describe("줄바꿈 규칙", () => {
  const css = readFileSync(join(__dirname, "../src/styles/global.css"), "utf8");

  it("영어 본문에 overflow-wrap: anywhere 를 쓰지 않는다", () => {
    // 주석을 제거한 실제 선언만 검사한다
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(declarations.includes("overflow-wrap: anywhere")).toBe(false);
  });

  it("한국어는 keep-all, 영어는 normal 로 분리되어 있다", () => {
    expect(css).toMatch(/:lang\(ko\)[\s\S]{0,400}?word-break: keep-all/);
    expect(css).toMatch(/:lang\(en\)[\s\S]{0,400}?word-break: normal/);
    expect(css).toMatch(/:lang\(en\)[\s\S]{0,400}?hyphens: none/);
  });

  it("How step 은 제목·본문을 한 칸으로 묶는다", () => {
    const how = readFileSync(join(__dirname, "../src/pages/How.tsx"), "utf8");
    expect(how).toContain('className="step-copy"');
    expect(css).toContain(".step-copy { min-width: 0; }");
    expect(css).toMatch(/\.step \{[^}]*grid-template-columns: minmax\(96px, 116px\)/);
    // 본문에 수동 <br> 을 넣지 않는다
    expect(how.includes("<br")).toBe(false);
  });

  it("공개 콘텐츠 본문에 수동 줄바꿈이 없다", () => {
    for (const src of [koPublic, enPublic, koStories, enStories]) {
      expect(JSON.stringify(src).includes("<br")).toBe(false);
    }
  });
});
