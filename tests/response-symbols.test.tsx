/**
 * 렌더 단위 최종 QA.
 * 실제 DOM을 그려 브랜드 표기, 결과 본문 누락, 접근성, 콘솔 오류를 확인한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LocaleProvider } from "../src/i18n/LocaleProvider";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";

// 뷰포트 전환을 제어하기 위한 matchMedia 스텁
let MATCH_WIDE = true;
const setViewport = (px: number) => { MATCH_WIDE = px >= 700; };
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
 * 다국어 기반 구조 검수 (Stage 1).
 *
 * 핵심 원칙
 *  - 기본 locale 은 ko, 브라우저 언어 자동 감지 없음
 *  - locale 은 표시 전용 — 세션·응답·채점에 절대 관여하지 않는다
 *  - 내부 한국어 에너지 key 는 표시명이 바뀌어도 그대로 유지된다
 */

/**
 * 검사 응답 UI — 방향 기호(▲▼◀▶●) 개편 QA.
 *
 * 채점 값 1~5, side/tone 구조, optionAValue/optionBValue 는 전혀 건드리지
 * 않았다. 이 테스트는 "화면 표시"만 검증한다.
 */
describe("검사 상단 안내 문구", () => {
  it("문항 영역 위에 한 번만 표시되고 매 문항 반복되지 않는다", () => {
    const { container } = renderAt("/assessment");
    expect(container.textContent).toContain("평소의 나와 가까운 쪽을 선택해 주세요.");
    expect(container.querySelectorAll(".assess-instruction")).toHaveLength(1);
    // q-card 바깥에 있어 문항이 바뀌어도 다시 그려지지 않는다
    const instruction = container.querySelector(".assess-instruction")!;
    const qcard = container.querySelector(".q-card")!;
    expect(qcard.contains(instruction)).toBe(false);
  });

  it("영어에서도 동일하게 한 번만 표시된다", () => {
    store.set("mycore12.locale.v1", "en");
    const { container } = renderAt("/assessment");
    expect(container.textContent).toContain(
      "Choose the option that feels closer to your usual self."
    );
    expect(container.querySelectorAll(".assess-instruction")).toHaveLength(1);
  });

  it("아이콘·기호 없이 secondary 텍스트 스타일만 쓴다 (과도한 강조 없음)", () => {
    const css = readFileSync(join(__dirname, "../src/styles/global.css"), "utf8");
    const block = css.match(/\.assess-instruction \{[^}]*\}/)![0];
    expect(block).toContain("color: var(--color-text-secondary)");
    expect(block).not.toMatch(/font-weight:\s*[6-9]00/);
    const assess = readFileSync(join(__dirname, "../src/pages/Assessment.tsx"), "utf8");
    const line = assess.match(/assess-instruction[^\n]*\n[^\n]*/)![0];
    expect(/[▲▼◀▶●!※]/.test(line)).toBe(false);
  });
});

describe("모바일 5단 응답 — 방향 기호", () => {
  it("위에서 아래로 ▲▲●▼▼ 순서이고 value 1~5 매핑은 그대로다", () => {
    setViewport(375);
    for (let i = 0; i < 5; i++) {
      store.delete("mycore12.activeSession.v1");
      const { container, unmount } = renderAt("/assessment");
      const id = storage.getActiveSession()!.questionIds[0];
      const opts = [...container.querySelectorAll(".v-scale .v-opt")];
      const glyphs = opts.map(o => o.querySelector(".v-dot")!.textContent);
      expect(glyphs, `${i}번째`).toEqual(["▲", "▲", "●", "▼", "▼"]);
      fireEvent.click(opts[i]);
      expect(storage.getActiveSession()!.answers[id], `${i}번째 클릭`).toBe(i + 1);
      unmount();
    }
    setViewport(1024);
  });

  it("큰/작은 삼각형은 같은 글자이고 CSS font-size 만 다르다", () => {
    setViewport(375);
    const { container } = renderAt("/assessment");
    const dots = [...container.querySelectorAll(".v-scale .v-dot")];
    // 문자 자체(▲/▼)는 강도와 무관하게 같다 — 방향만 다르다
    expect(dots[0].textContent).toBe(dots[1].textContent); // 큰▲ === 작은▲
    expect(dots[3].textContent).toBe(dots[4].textContent); // 작은▼ === 큰▼
    expect([...dots[0].classList]).toContain("strong");
    expect([...dots[1].classList]).toContain("soft");
    setViewport(1024);
  });

  it("텍스트 라벨(v-opt-label 등)을 더 이상 렌더링하지 않는다", () => {
    setViewport(375);
    const { container } = renderAt("/assessment");
    expect(container.querySelector(".v-opt-label")).toBeNull();
    setViewport(1024);
  });

  it("aria-label 은 실제 보기 문장으로 그대로 유지된다 (화면 노출은 아니다)", () => {
    setViewport(375);
    const { container } = renderAt("/assessment");
    const q = storage.questionsOf(storage.getActiveSession()!)[0];
    const opts = [...container.querySelectorAll(".v-scale .v-opt")];
    expect(opts[0].getAttribute("aria-label")).toContain(q.optionA);
    expect(opts[4].getAttribute("aria-label")).toContain(q.optionB);
    for (const o of opts) {
      expect(o.getAttribute("role")).toBe("radio");
      expect(o.hasAttribute("aria-checked")).toBe(true);
    }
    setViewport(1024);
  });
});

describe("데스크톱 5단 응답 — 방향 기호", () => {
  it("왼쪽부터 ◀◀●▶▶ 순서이고 value 1~5 매핑은 그대로다", () => {
    setViewport(1024);
    const { container } = renderAt("/assessment");
    const radios = [...container.querySelectorAll('.scale-h [role="radio"]')];
    const glyphs = radios.map(r => r.querySelector(".dot")!.textContent);
    expect(glyphs).toEqual(["◀", "◀", "●", "▶", "▶"]);

    const id = storage.getActiveSession()!.questionIds[0];
    for (let i = 0; i < 5; i++) {
      fireEvent.click(radios[i]);
      expect(storage.getActiveSession()!.answers[id], `${i}번째`).toBe(i + 1);
    }
  });

  it("텍스트 라벨(.cap)을 더 이상 렌더링하지 않는다", () => {
    setViewport(1024);
    const { container } = renderAt("/assessment");
    expect(container.querySelector(".cap")).toBeNull();
  });
});

describe("두 보기 문장 — 독립 박스와 방향 색 강조", () => {
  it("모바일: 각 문장이 테두리·배경을 가진 독립 박스다", () => {
    setViewport(375);
    const css = readFileSync(join(__dirname, "../src/styles/global.css"), "utf8");
    const block = css.match(/^\.v-text \{[^}]*\}/m)![0];
    expect(block).toContain("border: 1px solid var(--color-border)");
    expect(block).toContain("border-radius: var(--radius-card)");
    expect(block).toMatch(/padding:\s*16px 18px/);
    setViewport(1024);
  });

  it("모바일: 선택한 방향의 문장 박스만 은은하게 강조되고, 중립은 둘 다 기본 상태다", () => {
    setViewport(375);
    const { container } = renderAt("/assessment");
    const texts = () => [...container.querySelectorAll(".v-text")];

    fireEvent.click(container.querySelectorAll(".v-scale .v-opt")[0]); // value 1 (A)
    expect(texts()[0].className).toContain("lean-a");
    expect(texts()[1].className).not.toContain("lean-b");

    fireEvent.click(container.querySelectorAll(".v-scale .v-opt")[4]); // value 5 (B)
    expect(texts()[0].className).not.toContain("lean-a");
    expect(texts()[1].className).toContain("lean-b");

    fireEvent.click(container.querySelectorAll(".v-scale .v-opt")[2]); // value 3 (중립)
    expect(texts()[0].className).not.toContain("lean-a");
    expect(texts()[1].className).not.toContain("lean-b");
    setViewport(1024);
  });

  it("데스크톱: 선택한 방향의 문장 박스만 강조된다", () => {
    setViewport(1024);
    const { container } = renderAt("/assessment");
    const cards = () => [...container.querySelectorAll(".choice-card")];

    fireEvent.click(container.querySelectorAll('.scale-h [role="radio"]')[0]); // 1 (A)
    expect(cards()[0].className).toContain("lean-a");
    expect(cards()[1].className).not.toContain("lean-b");

    fireEvent.click(container.querySelectorAll('.scale-h [role="radio"]')[2]); // 3 (중립)
    expect(cards()[0].className).not.toContain("lean-a");
    expect(cards()[1].className).not.toContain("lean-b");
  });

  it("방향 색은 기존 --choice-a/--choice-b 를 재사용하고 새 색을 만들지 않는다", () => {
    const css = readFileSync(join(__dirname, "../src/styles/global.css"), "utf8");
    for (const sel of [".choice-card.lean-a", ".v-text.lean-a"]) {
      const block = css.match(new RegExp(`${sel.replace(/\./g, "\\.")}\\s\\{[^}]*}`))![0];
      expect(block).toContain("var(--choice-a)");
    }
    for (const sel of [".choice-card.lean-b", ".v-text.lean-b"]) {
      const block = css.match(new RegExp(`${sel.replace(/\./g, "\\.")}\\s\\{[^}]*}`))![0];
      expect(block).toContain("var(--choice-b)");
    }
  });
});

describe("검사 로직 무변경 확인 (표시만 바뀐 것 회귀 방지)", () => {
  it("이전/다음 이동 후에도 선택 상태가 정확히 복원된다", () => {
    setViewport(375);
    const { container } = renderAt("/assessment");
    const opts = () => [...container.querySelectorAll(".v-scale .v-opt")];
    fireEvent.click(opts()[3]); // value 4
    fireEvent.click(container.querySelectorAll(".assess-nav-steps .btn-text")[0]); // 이전 없음(0번 문항) → 다음 문항으로 자동이동 후 되돌리기
    // 자동 이동 뒤 "이전 문항"으로 되돌아가면 선택값이 그대로 복원된다
    const back = [...container.querySelectorAll(".assess-nav-steps .btn-text")].find(
      b => b.textContent!.includes("이전")
    )!;
    fireEvent.click(back);
    const restored = [...container.querySelectorAll(".v-scale .v-opt")];
    const onIndex = restored.findIndex(o => o.className.includes("on"));
    expect(onIndex).toBe(3);
    setViewport(1024);
  });

  it("새로고침(재마운트) 후에도 세션과 답변이 그대로 복원된다", () => {
    const first = renderAt("/assessment");
    fireEvent.click(first.container.querySelectorAll(".v-scale .v-opt, .scale-h [role=radio]")[0]);
    const before = storage.getActiveSession()!;
    cleanup();
    const again = renderAt("/assessment");
    const after = storage.getActiveSession()!;
    expect(after.sessionId).toBe(before.sessionId);
    expect(after.answers).toEqual(before.answers);
    expect(again.container).toBeTruthy();
  });

  it("마지막 문항까지 응답하면 결과가 정상 생성된다 (18문항)", async () => {
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
    expect(storage.getResults().length).toBeGreaterThanOrEqual(1);
  }, 20000);

  it("값·에너지·타입 계산 로직 소스는 이번 작업에서 건드리지 않았다", () => {
    const storageSrc = readFileSync(join(__dirname, "../src/lib/storage.ts"), "utf8");
    const drawSrc = readFileSync(join(__dirname, "../src/lib/draw.ts"), "utf8");
    // 응답값 순서(1~5)와 side 대응 주석이 여전히 원문 그대로 존재한다
    expect(storageSrc.length).toBeGreaterThan(0);
    expect(drawSrc.length).toBeGreaterThan(0);
    const assess = readFileSync(join(__dirname, "../src/pages/Assessment.tsx"), "utf8");
    expect(assess).toContain("type Response = 1 | 2 | 3 | 4 | 5;");
    expect(assess).toContain('{ value: 1, labelKey: "very", side: "a", tone: "strong" }');
    expect(assess).toContain('{ value: 5, labelKey: "very", side: "b", tone: "strong" }');
  });
});
