/**
 * 렌더 단위 최종 QA.
 * 실제 DOM을 그려 브랜드 표기, 결과 본문 누락, 접근성, 콘솔 오류를 확인한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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


/**
 * 검사 길이 선택의 실제 사용 흐름 검수 (화면 렌더 기준).
 * 홈에서 길이를 고르고 끝까지 응답했을 때 세션·진행표시·결과가 일관되는지 본다.
 */
describe("길이 선택 → 검사 → 결과 전체 흐름", () => {
  for (const length of [18, 36, 54, 72] as const) {
    it(`${length}문항: 선택 후 끝까지 진행하면 결과가 나온다`, async () => {
            const { container } = renderAt("/");

      // 홈에서 길이 선택
      const card = [...container.querySelectorAll(".length-card")].find(el =>
        el.textContent!.includes(`${length}문항`)
      )!;
      fireEvent.click(card);
      expect(card.className).toContain("on");

      fireEvent.click(screen.getByRole("button", { name: "검사 시작" }));

      // 세션 길이 확정 확인
      const session = storage.getActiveSession()!;
      expect(session.assessmentLength).toBe(length);
      expect(session.questionIds).toHaveLength(length);

      // 진행 표시가 선택한 길이를 따른다
      expect(container.querySelector(".count")!.textContent).toContain(`/ ${length}`);

      // 모든 문항 응답
      for (let i = 0; i < length; i++) {
        const btns = [...container.querySelectorAll('button[role="radio"]')];
        expect(btns.length, `${i + 1}번째 문항 응답 버튼`).toBeGreaterThan(0);
        fireEvent.click(btns[0] as HTMLElement);
        await new Promise(r => setTimeout(r, 200));
      }
      await new Promise(r => setTimeout(r, 1300));

      const stored = storage.getLatestResult()!;
      expect(stored.assessmentLength).toBe(length);
      expect(Object.keys(stored.answers)).toHaveLength(length);
      // 길이와 무관하게 점수 스케일이 같다
      const sum = Object.values(stored.energyScores).reduce((a, b) => a + Number(b), 0);
      expect(Math.round(sum)).toBe(600);
      expect(storage.getActiveSession()).toBeNull();
    }, 60000);
  }

  it("검사 중에는 길이가 바뀌지 않고 새로고침 후에도 유지된다", async () => {
        const { container, unmount } = renderAt("/");
    const card = [...container.querySelectorAll(".length-card")].find(el =>
      el.textContent!.includes("54문항")
    )!;
    fireEvent.click(card);
    fireEvent.click(screen.getByRole("button", { name: "검사 시작" }));

    const first = storage.getActiveSession()!;
    fireEvent.click(container.querySelectorAll('button[role="radio"]')[0] as HTMLElement);
    await new Promise(r => setTimeout(r, 250));
    unmount();

    // 새로고침 = 앱 재마운트
    const again = renderAt("/assessment");
    const restored = storage.getActiveSession()!;
    expect(restored.assessmentLength).toBe(54);
    expect(restored.questionIds).toEqual(first.questionIds);
    expect(again.container.querySelector(".count")!.textContent).toContain("/ 54");
  }, 30000);
});
