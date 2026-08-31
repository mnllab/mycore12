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

/**
 * 방문자 수 / 검사 이용자 수 카운터.
 * 실제 네트워크는 스텁으로 대체해 결정적으로 검증한다 — 이 카운터는
 * 어떤 경우에도 앱의 핵심 동작(검사·채점·저장)을 막아서는 안 된다.
 */
describe("방문자 카운터 — 정상 응답", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    sessionStorage.clear(); // 세션당 1회 집계 로직을 매 테스트마다 독립적으로 검증한다
    globalThis.fetch = vi.fn(async (url: string) => {
      const value = url.includes("assessment_completions") ? 42 : 1234;
      return {
        ok: true,
        json: async () => ({ value })
      } as Response;
    }) as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("푸터에 방문자 수·검사 이용자 수가 표시된다", async () => {
    const { container } = renderAt("/");
    await new Promise(r => setTimeout(r, 50));
    const counter = container.querySelector(".visitor-counter");
    expect(counter).not.toBeNull();
    expect(counter!.textContent).toContain("누적 방문자 1,234명");
    expect(counter!.textContent).toContain("검사 완료 42건");
  });

  it("English 화면에서도 정상 표시된다", async () => {
    store.set("mycore12.locale.v1", "en");
    const { container } = renderAt("/");
    await new Promise(r => setTimeout(r, 50));
    const counter = container.querySelector(".visitor-counter");
    expect(counter!.textContent).toContain("Total Visitors: 1,234");
    expect(counter!.textContent).toContain("Assessments Completed: 42");
  });

  it("앱이 켜질 때 방문 hit 요청을 한 번 보내고, 같은 세션에서는 다시 보내지 않는다", async () => {
    const first = renderAt("/");
    await new Promise(r => setTimeout(r, 50));
    const hitCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      c => String(c[0]).includes("/hit/") && String(c[0]).includes("site_visits")
    );
    expect(hitCalls.length).toBe(1);
    cleanup();

    renderAt("/about"); // 같은 세션에서 다른 페이지로 이동해도 다시 세지 않는다
    await new Promise(r => setTimeout(r, 50));
    const hitCallsAfter = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      c => String(c[0]).includes("/hit/") && String(c[0]).includes("site_visits")
    );
    expect(hitCallsAfter.length).toBe(1);
    void first;
  });

  it("검사를 완료했을 때만 이용자 수 hit 이 한 번 나가고, 결과를 다시 열 때는 나가지 않는다", async () => {
    const home = renderAt("/");
    fireEvent.click(
      [...home.container.querySelectorAll(".length-card")].find(c =>
        c.textContent!.includes("18문항")
      )!
    );
    fireEvent.click(screen.getByRole("button", { name: "검사 시작" }));

    const { container } = renderAt("/assessment");
    for (let i = 0; i < 18; i++) {
      const opts = container.querySelectorAll(".v-scale .v-opt, .scale-h [role=radio]");
      fireEvent.click(opts[i % 5]);
      await new Promise(res => setTimeout(res, 200));
    }
    await new Promise(res => setTimeout(res, 1300));

    const completionHits = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      c => String(c[0]).includes("/hit/") && String(c[0]).includes("assessment_completions")
    );
    expect(completionHits.length).toBe(1);

    const stored = storage.getResults()[0];
    renderAt(`/result/${stored.sessionId}`); // 결과를 다시 열어도 추가로 세지 않는다
    await new Promise(r => setTimeout(r, 50));
    const completionHitsAfter = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      c => String(c[0]).includes("/hit/") && String(c[0]).includes("assessment_completions")
    );
    expect(completionHitsAfter.length).toBe(1);
  }, 20000);

  it("get 요청은 값을 증가시키지 않는다 — 화면 표시는 hit 이 아니라 get 을 쓴다", async () => {
    renderAt("/");
    await new Promise(r => setTimeout(r, 50));
    const getCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(c =>
      String(c[0]).includes("/get/")
    );
    expect(getCalls.length).toBeGreaterThanOrEqual(2); // 방문자·이용자 두 값 조회
  });
});

describe("방문자 카운터 — 서비스 실패 시 안전하게 무시", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("네트워크가 실패해도 화면이 깨지지 않고 카운터 줄만 조용히 사라진다", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const { container } = renderAt("/");
    await new Promise(r => setTimeout(r, 50));
    expect(container.querySelector(".visitor-counter")).toBeNull();
    // 핵심 UI는 정상이다
    expect(container.querySelectorAll(".length-card")).toHaveLength(4);
  });

  it("서비스가 없어도 검사 완료 흐름 자체는 그대로 동작한다", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const stored = buildResult(2);
    expect(stored.sessionId).toBeTruthy();
    const sum = Object.values(stored.energyScores).reduce((a, b) => a + Number(b), 0);
    expect(Math.round(sum)).toBe(600);
  });
});

describe("개인정보 안내에 카운팅 사실이 명시된다", () => {
  it("ko/en Privacy 페이지에 방문자 수 집계 안내가 있다", () => {
    for (const locale of ["ko", "en"] as const) {
      store.clear();
      store.set("mycore12.locale.v1", locale);
      const { container, unmount } = renderAt("/privacy");
      const text = container.textContent!;
      expect(text, locale).toContain(
        locale === "ko" ? "방문자 수 집계" : "Visitor Counting"
      );
      expect(text, locale).toContain(
        locale === "ko" ? "개인 식별 정보는 전송되지 않습니다" : "does not include your name"
      );
      unmount();
    }
  });
});
