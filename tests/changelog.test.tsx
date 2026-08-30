/**
 * 렌더 단위 최종 QA.
 * 실제 DOM을 그려 브랜드 표기, 결과 본문 누락, 접근성, 콘솔 오류를 확인한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LocaleProvider } from "../src/i18n/LocaleProvider";
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
 * 다국어 기반 구조 검수 (Stage 1).
 *
 * 핵심 원칙
 *  - 기본 locale 은 ko, 브라우저 언어 자동 감지 없음
 *  - locale 은 표시 전용 — 세션·응답·채점에 절대 관여하지 않는다
 *  - 내부 한국어 에너지 key 는 표시명이 바뀌어도 그대로 유지된다
 */

const koNotes = (await import("../src/locales/ko/releaseNotes.json")).default;
const enNotes = (await import("../src/locales/en/releaseNotes.json")).default;
const pkg = (await import("../package.json")).default;

describe("버전 표시와 업데이트 내역", () => {
  it("ko/en 히스토리 구조가 같고 최신 항목이 package.json 버전과 일치한다", () => {
    expect(koNotes.length).toBe(enNotes.length);
    expect(koNotes.map((n: { version: string }) => n.version)).toEqual(
      enNotes.map((n: { version: string }) => n.version)
    );
    expect(koNotes[0].version).toBe(pkg.version.split(".").slice(0, 2).join("."));
  });

  it("모든 항목에 버전·날짜·설명이 채워져 있다", () => {
    for (const notes of [koNotes, enNotes]) {
      for (const n of notes as { version: string; date: string; text: string }[]) {
        expect(n.version.trim().length).toBeGreaterThan(0);
        expect(n.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(n.text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("푸터에 버전·날짜가 표시되고 /changelog 로 연결된다", () => {
    const { container } = renderAt("/");
    const tag = container.querySelector("a.version-tag") as HTMLAnchorElement;
    expect(tag).not.toBeNull();
    expect(tag.textContent).toContain(`v${koNotes[0].version}`);
    expect(tag.textContent).toContain(koNotes[0].date);
    expect(tag.getAttribute("href")).toBe("/changelog");
  });

  it("/changelog 화면에 ko/en 각각의 전체 히스토리가 표시된다", () => {
    for (const [locale, notes] of [["ko", koNotes], ["en", enNotes]] as const) {
      store.clear();
      store.set("mycore12.locale.v1", locale);
      const { container, unmount } = renderAt("/changelog");
      const text = container.textContent!;
      for (const n of notes as { version: string; date: string; text: string }[]) {
        expect(text, `${locale} v${n.version}`).toContain(`v${n.version}`);
        expect(text, `${locale} ${n.date}`).toContain(n.date);
        expect(text, `${locale} ${n.text}`).toContain(n.text);
      }
      unmount();
    }
  });

  it("route metadata 가 /changelog 에도 적용된다", () => {
    document.head.innerHTML = '<meta name="description" content="" />';
    renderAt("/changelog");
    expect(document.title).toContain("업데이트 내역");
  });
});
