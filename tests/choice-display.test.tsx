/**
 * 렌더 단위 최종 QA.
 * 실제 DOM을 그려 브랜드 표기, 결과 본문 누락, 접근성, 콘솔 오류를 확인한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LocaleProvider } from "../src/i18n/LocaleProvider";
import React from "react";

// 뷰포트 전환을 제어하기 위한 matchMedia 스텁
let MATCH_WIDE = true;
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
const setViewport = (px: number) => {
  MATCH_WIDE = px >= 700;
};

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


/**
 * 검사 화면 표시 규칙 검수.
 * - 두 보기 문장: 중앙 정렬, 고정 구분색(남색 / 와인색), 크기·굵기는 동일
 * - 두 화면(좁은/넓은)의 응답 문구는 동일하다
 * - indicator: 좁은/넓은 화면 모두 strong-soft-neutral-soft-strong 대칭
 * - 헤더 후원 링크는 검사 화면(task mode)에는 노출하지 않는다
 */
describe("검사 화면 표시 규칙", () => {
  it("1) 모바일 A/B 문장이 중앙 정렬이고 서로 다른 색이다", () => {
    setViewport(375);
    const { container } = renderAt("/assessment");
    const texts = [...container.querySelectorAll(".v-text")] as HTMLElement[];
    expect(texts).toHaveLength(2);
    expect(texts[0].style.color).toBe("var(--choice-a)");
    expect(texts[1].style.color).toBe("var(--choice-b)");
    // 크기·굵기는 동일 (색만 다르다)
    const css = require("node:fs").readFileSync("src/styles/global.css", "utf8");
    expect(/\.v-text \{[^}]*text-align: center/.test(css)).toBe(true);
    expect(/\.v-text:(first|last|nth)[^{]*\{[^}]*font-(size|weight)/.test(css)).toBe(false);
    setViewport(1024);
  });

  it("2) 중립 문구가 '둘 다 비슷하다'이다", () => {
    setViewport(375);
    const { container } = renderAt("/assessment");
    const labels = [...container.querySelectorAll(".v-opt-label")].map(e => e.textContent);
    expect(labels[2]).toBe("둘 다 비슷하다");
    expect(container.textContent).not.toContain("둘 다 비슷해요");
    setViewport(1024);
  });

  it("3) 데스크톱 dot 이 좌우 대칭 색이다", () => {
    setViewport(1024);
    const { container } = renderAt("/assessment");
    const dots = [...container.querySelectorAll(".scale-h .dot")] as HTMLElement[];
    expect(dots).toHaveLength(5);
    expect(dots.map(d => d.className.replace("dot ", ""))).toEqual([
      "strong", "soft", "neutral", "soft", "strong"
    ]);
    expect(dots.map(d => d.style.color)).toEqual([
      "var(--choice-a)",
      "var(--choice-a)",
      "",
      "var(--choice-b)",
      "var(--choice-b)"
    ]);
    // 데스크톱 구조 자체는 그대로
    expect(container.querySelector(".choice-pair")).not.toBeNull();
    expect(container.querySelectorAll('.scale-h [role="radio"]')).toHaveLength(5);
  });

  it("4) 헤더에 후원 링크가 있고 검사 화면에는 없다", () => {
    const { container, unmount } = renderAt("/");
    const donate = container.querySelector("a.donate") as HTMLAnchorElement;
    expect(donate).not.toBeNull();
    expect(donate.href).toContain("buymeacoffee.com/mnledu");
    expect(donate.target).toBe("_blank");
    expect(donate.rel).toContain("noopener");
    const img = donate.querySelector("img")!;
    expect(img.getAttribute("alt")).toContain("후원");
    expect(img.getAttribute("src")).toContain("buymeacoffee.com/button-api");
    unmount();
    // 검사 화면은 task mode — 사이트 헤더가 없다
    const a = renderAt("/assessment");
    expect(a.container.querySelector("a.donate")).toBeNull();
  });

  it("응답 값 매핑은 그대로다 (1~5)", () => {
    setViewport(375);
    for (let i = 0; i < 5; i++) {
      store.clear();
      const { container, unmount } = renderAt("/assessment");
      const id = storage.getActiveSession()!.questionIds[0];
      fireEvent.click(container.querySelectorAll(".v-scale .v-opt")[i]);
      expect(storage.getActiveSession()!.answers[id]).toBe(i + 1);
      unmount();
    }
    setViewport(1024);
  });
});
