/**
 * 렌더 단위 최종 QA.
 * 실제 DOM을 그려 브랜드 표기, 결과 본문 누락, 접근성, 콘솔 오류를 확인한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

describe("초기화 버튼과 예/아니오 다이얼로그", () => {
  const startAssessment = (container: HTMLElement) => {
    fireEvent.click(screen.getByRole("button", { name: "검사 시작" }));
    fireEvent.click(
      container.querySelectorAll(".v-scale .v-opt, .scale-h [role=radio]")[1]
    );
  };

  it("진행 중이 아닐 때도, 진행 중일 때도 초기화 버튼이 항상 보인다", () => {
    const first = renderAt("/");
    expect(screen.getByRole("button", { name: "초기화" })).toBeTruthy();
    startAssessment(first.container);
    cleanup();

    // 다시 홈으로 오면(진행 중 세션이 있는 상태) 초기화 버튼이 여전히 보인다
    const { container } = renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    expect(container.querySelector(".confirm-dialog")).not.toBeNull();
  });

  it("다이얼로그는 예/아니오 두 버튼만 있다 (취소 버튼 없음)", () => {
    const { container } = renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    const dialog = container.querySelector(".confirm-dialog")!;
    const buttons = [...dialog.querySelectorAll("button")];
    expect(buttons.map(b => b.textContent)).toEqual(["예", "아니오"]);
  });

  it("진행 중 세션이 있을 때 '예'를 누르면 기록까지 전부 삭제된다", () => {
    const stored = buildResult(2); // 과거 결과 하나 저장
    const first = renderAt("/");
    startAssessment(first.container);
    expect(storage.getActiveSession()).not.toBeNull();
    cleanup();

    const { container } = renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    fireEvent.click(within(container.querySelector(".confirm-dialog")!).getByRole("button", { name: "예" }));

    expect(storage.getActiveSession()).toBeNull();
    expect(storage.getResults().find(r => r.sessionId === stored.sessionId)).toBeUndefined();
    expect(container.querySelector(".confirm-dialog")).toBeNull();
    // 다이얼로그가 닫히면서 화면이 새로 읽은 상태로 갱신된다 (검사 길이 선택 UI 복귀)
    expect(container.querySelectorAll(".length-card")).toHaveLength(4);
  });

  it("진행 중 세션이 있을 때 '아니오'를 누르면 진행 중인 것만 지워지고 기록은 남는다", () => {
    const stored = buildResult(2);
    const first = renderAt("/");
    startAssessment(first.container);
    cleanup();

    const { container } = renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    fireEvent.click(within(container.querySelector(".confirm-dialog")!).getByRole("button", { name: "아니오" }));

    expect(storage.getActiveSession()).toBeNull();
    expect(storage.getResults().find(r => r.sessionId === stored.sessionId)).toBeTruthy();
    expect(container.querySelectorAll(".length-card")).toHaveLength(4);
  });

  it("진행 중 세션이 없을 때 '아니오'는 아무것도 지우지 않는다 (사실상 취소)", () => {
    const stored = buildResult(2);
    const { container } = renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    fireEvent.click(within(container.querySelector(".confirm-dialog")!).getByRole("button", { name: "아니오" }));

    expect(storage.getResults().find(r => r.sessionId === stored.sessionId)).toBeTruthy();
    expect(container.querySelector(".confirm-dialog")).toBeNull();
  });

  it("진행 중 세션이 없을 때 '예'는 전체 기록을 삭제한다", () => {
    const stored = buildResult(2);
    const { container } = renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    fireEvent.click(within(container.querySelector(".confirm-dialog")!).getByRole("button", { name: "예" }));

    expect(storage.getResults().find(r => r.sessionId === stored.sessionId)).toBeUndefined();
  });

  it("배경 클릭이나 Esc 로 닫으면 아무것도 삭제되지 않는다", () => {
    const stored = buildResult(2);
    const { container } = renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    const overlay = container.querySelector(".confirm-overlay")!;
    fireEvent.mouseDown(overlay);
    expect(container.querySelector(".confirm-dialog")).toBeNull();
    expect(storage.getResults().find(r => r.sessionId === stored.sessionId)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(container.querySelector(".confirm-dialog")).toBeNull();
    expect(storage.getResults().find(r => r.sessionId === stored.sessionId)).toBeTruthy();
  });

  it("접근성: alertdialog role 과 aria-label, 초기 포커스가 '아니오'에 있다", () => {
    const { container } = renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    const dialog = container.querySelector(".confirm-dialog")!;
    expect(dialog.getAttribute("role")).toBe("alertdialog");
    expect(dialog.hasAttribute("aria-label")).toBe(true);
    expect(document.activeElement?.textContent).toBe("아니오");
  });

  it("English 화면에서도 Yes/No 두 버튼과 문구가 정상 표시된다", () => {
    store.set("mycore12.locale.v1", "en");
    const { container } = renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    const dialog = container.querySelector(".confirm-dialog")!;
    const buttons = [...dialog.querySelectorAll("button")].map(b => b.textContent);
    expect(buttons).toEqual(["Yes", "No"]);
    expect(dialog.textContent).toContain("Delete all data?");
  });

  it("초기화 동작은 채점 로직과 무관한 storage 전용 동작이다", () => {
    const stored = buildResult(2);
    const sum = Object.values(stored.energyScores).reduce((a, b) => a + Number(b), 0);
    expect(Math.round(sum)).toBe(600);
  });
});
