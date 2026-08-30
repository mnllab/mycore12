/**
 * 렌더 단위 최종 QA.
 * 실제 DOM을 그려 브랜드 표기, 결과 본문 누락, 접근성, 콘솔 오류를 확인한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
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

describe("결과 화면의 처음으로 버튼", () => {
  it("'다시 검사하기'가 사라지고 '처음으로' 링크가 Home 으로 이동한다", () => {
    const stored = buildResult(2);
    const { container } = renderAt(`/result/${stored.sessionId}`);
    const actions = container.querySelector(".result-actions")!;

    expect(actions.textContent).not.toContain("다시 검사하기");
    const backLink = within(actions).getByRole("link", { name: "처음으로" });
    expect(backLink.getAttribute("href")).toBe("/");
  });

  it("English 화면에서도 동일하게 Home 으로 연결된다", () => {
    store.set("mycore12.locale.v1", "en");
    const stored = buildResult(2);
    const { container } = renderAt(`/result/${stored.sessionId}`);
    const link = within(container.querySelector(".result-actions")!).getByRole("link", {
      name: "Back to Home"
    });
    expect(link.getAttribute("href")).toBe("/");
  });

  it("처음으로 이동한 뒤 다시 검사 길이를 선택할 수 있다 (Home 이 진행 중 세션에 막히지 않는다)", () => {
    const stored = buildResult(2);
    // 결과 완료 시점에 activeSession 은 이미 정리되어 있다
    expect(storage.getActiveSession()).toBeNull();
    renderAt(`/result/${stored.sessionId}`);
    cleanup();

    const home = renderAt("/");
    // 진행 중 세션이 없으므로 "이어서 진행하기"가 아니라 검사 길이 선택 UI 가 보인다
    expect(home.container.querySelectorAll(".length-card")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "검사 시작" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "이어서 진행하기" })).toBeNull();
  });

  it("결과 저장 데이터와 채점 로직은 이 변경과 무관하다", () => {
    const stored = buildResult(3);
    const sum = Object.values(stored.energyScores).reduce((a, b) => a + Number(b), 0);
    expect(Math.round(sum)).toBe(600);
    expect(storage.getResults()).toHaveLength(1);
  });
});
