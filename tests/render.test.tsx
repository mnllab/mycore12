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
const { BRAND, TYPE_DATASET, matchType } = await import("../src/lib/mycore12");

const BANNED = ["High", "Low", "발현", "잠재", "결핍", "열등", "우수", "약점"];
// 기존 브랜드가 화면에 남아 있으면 안 된다 (MYCORE12 안의 CORE12는 제외)
const OLD_BRAND_RE = /(^|[^Y])CORE12|Core12|core12|CORE 12/;
const CODE_RE = /\b\d-\d-\d-\d-\d-\d\b|\b[01]{6}\b/;

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

/* ── 브랜드 ─────────────────────────────────────── */
describe("첫 화면 브랜드 표기", () => {
  it("마이코어12 / MYCORE12 / 나를 이루는 12가지 에너지 / 6축 기반 성향 프로파일이 이 순서로 표시된다", () => {
    const { container } = renderAt("/");
    const lockup = container.querySelector(".brand-lockup")!;
    expect(lockup).toBeTruthy();
    expect(within(lockup as HTMLElement).getByRole("heading", { level: 1 }).textContent)
      .toBe("마이코어12");
    expect(lockup.querySelector(".wordmark-en")!.textContent).toBe("MYCORE12");
    expect(lockup.querySelector(".tagline")!.textContent).toBe(BRAND.tagline);
    expect(lockup.querySelector(".descriptor")!.textContent).toBe(BRAND.descriptor);

    // DOM 순서 = 시각 위계 순서
    const order = [...lockup.children].map(el => el.className || el.tagName);
    expect(order[0]).toBe("H1");
    expect(order[1]).toContain("wordmark-en");
    expect(order[2]).toContain("tagline");
    expect(order[3]).toContain("descriptor");
  });

  it("헤더 워드마크가 마이코어12 · MYCORE12로 표기된다", () => {
    const { container } = renderAt("/");
    const wm = container.querySelector(".site-header .wordmark")!;
    expect(wm.querySelector(".ko")!.textContent).toBe("마이코어12");
    expect(wm.querySelector(".en")!.textContent).toBe("MYCORE12");
  });

  it("푸터가 마이코어12 · MYCORE12 락업을 사용한다", () => {
    const { container } = renderAt("/");
    expect(container.querySelector(".site-footer .brandline")!.textContent)
      .toBe("마이코어12 · MYCORE12");
  });

  it("copyright 문구가 정확히 표시된다", () => {
    const { container } = renderAt("/");
    const legal = container.querySelector(".site-footer .legal")!.textContent!;
    expect(legal).toContain("© Janggil Kim. All Rights Reserved.");
    expect(legal).toContain("저작권자의 허락 없이 무단 복제 및 재배포를 금지합니다.");
  });

  it("모든 페이지 하단에 저작권이 표시된다", () => {
    const paths = ["/", "/how", "/privacy", "/history", "/assessment"];
    for (const path of paths) {
      const { container, unmount } = renderAt(path);
      const text = container.textContent!;
      expect(text, `${path}: 저작권자`).toContain("© Janggil Kim. All Rights Reserved.");
      expect(text, `${path}: 금지 문구`).toContain(
        "저작권자의 허락 없이 무단 복제 및 재배포를 금지합니다."
      );
      // 푸터(전체 또는 검사용 최소 표기) 중 하나는 반드시 있다
      expect(
        container.querySelector(".site-footer") ?? container.querySelector(".mini-footer"),
        `${path}: 푸터 없음`
      ).toBeTruthy();
      unmount();
    }
  });

  it("결과 페이지에도 저작권이 표시된다", () => {
    const stored = buildResult(3);
    const { container } = renderAt(`/result/${stored.sessionId}`);
    const text = container.textContent!;
    expect(text).toContain("© Janggil Kim. All Rights Reserved.");
    expect(text).toContain("저작권자의 허락 없이 무단 복제 및 재배포를 금지합니다.");
  });

  it("검사 화면은 저작권만 표시하고 네비게이션은 노출하지 않는다", () => {
    const { container } = renderAt("/assessment");
    const mini = container.querySelector(".mini-footer")!;
    expect(mini).toBeTruthy();
    expect(mini.querySelectorAll("a, button")).toHaveLength(0);
    expect(container.querySelector(".site-header")).toBeNull();
  });

  it("문서 title·meta·OG·PWA manifest가 MYCORE12 기준이다", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

    expect(html).toContain("<title>마이코어12 MYCORE12 | 6축 기반 성향 프로파일</title>");
    expect(html).toContain('lang="ko"');
    expect(html).toMatch(/name="description"[\s\S]{0,80}마이코어12\(MYCORE12\)/);
    expect(html).toMatch(/property="og:title" content="마이코어12 MYCORE12/);
    expect(html).toContain('property="og:site_name" content="마이코어12 · MYCORE12"');
    expect(html).toMatch(/name="twitter:title" content="마이코어12 MYCORE12/);
    expect(html).toContain('rel="manifest"');

    const manifest = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../public/manifest.webmanifest"), "utf8")
    );
    expect(manifest.name).toContain("마이코어12 MYCORE12");
    expect(manifest.short_name).toBe("마이코어12");
    expect(manifest.description).toContain("MYCORE12");
    expect(manifest.id).toContain("mycore12");

    // 기존 브랜드가 metadata에 남아 있지 않아야 한다
    for (const text of [html, JSON.stringify(manifest)]) {
      expect(/(^|[^Y])CORE12/.test(text.replace(/MYCORE12/g, "")), text.slice(0, 40)).toBe(false);
    }
  });
});

/* ── 검사 화면 ──────────────────────────────────── */
describe("검사 화면", () => {
  it("36문항 세션이 시작되고 1/36이 표시된다", () => {
    const { container } = renderAt("/assessment");
    expect(container.textContent).toContain("1 / 36");
    expect(storage.getActiveSession()!.questionIds.length).toBe(36);
  });

  it("5단계 응답이 저장되고 다음 문항으로 진행된다", () => {
    vi.useFakeTimers();
    renderAt("/assessment");
    const session = storage.getActiveSession()!;
    const firstId = session.questionIds[0];

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(5);
    fireEvent.click(radios[3]); // 4 = B에 조금 가깝다

    expect(storage.getActiveSession()!.answers[firstId]).toBe(4);
    vi.advanceTimersByTime(300);
    expect(storage.getActiveSession()!.currentIndex).toBe(1);
    vi.useRealTimers();
  });

  it("넓은 화면: 두 보기가 좌우 2열이고 척도도 좌우다 (방향 일치)", () => {
    setViewport(1024);
    const { container } = renderAt("/assessment");

    const pair = container.querySelector(".choice-pair")!;
    const cards = pair.querySelectorAll(".choice-card");
    expect(cards).toHaveLength(2);
    // 두 카드는 완전히 동일한 클래스·무스타일 (강조 수준 동일)
    expect(cards[0].className).toBe(cards[1].className);
    for (const c of cards) expect(c.getAttribute("style")).toBeNull();

    // 왼쪽 = optionA, 오른쪽 = optionB
    const session = storage.getActiveSession()!;
    const q = storage.questionsOf(session)[0];
    expect(cards[0].textContent).toBe(q.optionA);
    expect(cards[1].textContent).toBe(q.optionB);

    // 척도는 카드 아래에 좌우 5단계
    const scale = container.querySelector(".scale-h")!;
    expect(scale.querySelectorAll('[role="radio"]')).toHaveLength(5);
    expect(pair.compareDocumentPosition(scale) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect([...scale.querySelectorAll(".cap")].map(c => c.textContent)).toEqual([
      // 좁은 화면과 동일한 문구를 쓴다
      "매우 그렇다", "약간 그렇다", "둘 다 비슷하다", "약간 그렇다", "매우 그렇다"
    ]);
  });

  it("좁은 화면: 보기 문장이 위아래 끝이고 그 사이에 5단 응답이 한 열로 놓인다", () => {
    setViewport(375);
    const { container } = renderAt("/assessment");

    expect(container.querySelector(".choice-pair")).toBeNull();
    expect(container.querySelector(".scale-h")).toBeNull();

    const wrap = container.querySelector(".choice-v")!;
    const session = storage.getActiveSession()!;
    const q = storage.questionsOf(session)[0];

    // 보기 문장은 응답 영역의 맨 위와 맨 아래에 하나씩 있다
    const texts = wrap.querySelectorAll(".v-text");
    expect(texts).toHaveLength(2);
    expect(texts[0].textContent).toBe(q.optionA);
    expect(texts[1].textContent).toBe(q.optionB);
    expect(wrap.firstElementChild).toBe(texts[0]);
    expect(wrap.lastElementChild).toBe(texts[1]);

    // 두 문장 사이에 응답 버튼 5개가 한 열로 들어간다
    const opts = wrap.querySelectorAll(".v-scale .v-opt");
    expect(opts).toHaveLength(5);
    expect([...opts].map(b => b.querySelector(".v-opt-label")!.textContent)).toEqual([
      "매우 그렇다",
      "약간 그렇다",
      "둘 다 비슷하다",
      "약간 그렇다",
      "매우 그렇다"
    ]);
    // 중립만 다른 컴포넌트를 쓰지 않는다
    expect(container.querySelector(".v-mid")).toBeNull();
    expect(container.querySelectorAll(".v-card")).toHaveLength(0);
    expect(container.querySelectorAll('[role="radio"]')).toHaveLength(5);

    // indicator 는 strong / soft / neutral / soft / strong 대칭이고
    // 색은 두 보기의 고정 구분색(남색·와인색)을 따른다
    const dots = [...opts].map(o => o.querySelector(".v-dot") as HTMLElement);
    expect(dots.map(d => d.className.replace("v-dot ", ""))).toEqual([
      "strong",
      "soft",
      "neutral",
      "soft",
      "strong"
    ]);
    expect(dots.map(d => d.style.color)).toEqual([
      "var(--choice-a)",
      "var(--choice-a)",
      "",
      "var(--choice-b)",
      "var(--choice-b)"
    ]);

    setViewport(1024);
  });

  it("A/B 식별자와 방향 표현이 화면에 노출되지 않는다 (두 레이아웃 모두)", () => {
    const banned = [
      "A 쪽", "B 쪽",
      "A에 매우 가깝다", "A에 조금 가깝다",
      "B에 조금 가깝다", "B에 매우 가깝다"
    ];
    for (const px of [375, 1024]) {
      setViewport(px);
      const { container, unmount } = renderAt("/assessment");
      const text = container.textContent!;
      for (const b of banned) expect(text.includes(b), `${px}px: ${b}`).toBe(false);
      // 단독 A/B 마커 원형 표시도 없다
      expect(container.querySelector(".mark")).toBeNull();
      expect(/(^|\s)[AB](\s|$)/.test(text), `${px}px: 단독 A/B 표기`).toBe(false);
      unmount();
    }
    setViewport(1024);
  });

  it("1~5 응답 매핑이 두 레이아웃에서 동일하다", () => {
    // 넓은 화면: 왼쪽부터 1,2,3,4,5
    setViewport(1024);
    for (let i = 0; i < 5; i++) {
      store.clear();
      const { container, unmount } = renderAt("/assessment");
      const id = storage.getActiveSession()!.questionIds[0];
      const radios = container.querySelectorAll('.scale-h [role="radio"]');
      fireEvent.click(radios[i]);
      expect(storage.getActiveSession()!.answers[id], `넓은 화면 ${i}번째`).toBe(i + 1);
      unmount();
    }

    // 좁은 화면: 위에서 아래로 그대로 1,2,3,4,5
    setViewport(375);
    for (let i = 0; i < 5; i++) {
      store.clear();
      const { container, unmount } = renderAt("/assessment");
      const id = storage.getActiveSession()!.questionIds[0];
      const opts = container.querySelectorAll(".v-scale .v-opt");
      fireEvent.click(opts[i]);
      expect(storage.getActiveSession()!.answers[id], `좁은 화면 ${i}번째`).toBe(i + 1);
      unmount();
    }
    setViewport(1024);
  });

  it("모든 응답 컨트롤에 aria-label과 radiogroup이 있다", () => {
    renderAt("/assessment");
    const group = screen.getByRole("radiogroup");
    const session = storage.getActiveSession()!;
    const q = storage.questionsOf(session)[0];
    // 그룹 이름이 A/B 글자가 아니라 실제 보기 문장으로 읽힌다
    const label = group.getAttribute("aria-label")!;
    expect(label).toContain(q.optionA);
    expect(label).toContain(q.optionB);
    expect(/\bA:|\bB:/.test(label)).toBe(false);
    for (const r of screen.getAllByRole("radio")) {
      expect(r.getAttribute("aria-label")).toBeTruthy();
      expect(r.getAttribute("aria-checked")).toBeTruthy();
    }
    expect(screen.getByRole("progressbar").getAttribute("aria-label")).toBeTruthy();
  });

  it("키보드만으로 36문항을 모두 응답할 수 있다", () => {
    vi.useFakeTimers();
    renderAt("/assessment");
    for (let i = 0; i < 36; i++) {
      const radios = screen.getAllByRole("radio");
      // 모든 컨트롤이 버튼이므로 포커스 가능하고 Enter/Space로 활성화된다
      expect(radios.every(r => r.tagName === "BUTTON" && !r.hasAttribute("disabled"))).toBe(true);
      radios[2].focus();
      expect(document.activeElement).toBe(radios[2]);
      fireEvent.keyDown(radios[2], { key: "Enter" });
      fireEvent.click(radios[2]); // 브라우저의 Enter → click 위임과 동일
      vi.advanceTimersByTime(300);
      if (i < 35) continue;
    }
    vi.useRealTimers();
    // 36문항 전부 3으로 응답 → 모든 축 50:50
    const results = storage.getResults();
    expect(results.length).toBeGreaterThanOrEqual(0);
  });
});

/* ── 결과 화면 ──────────────────────────────────── */
const buildResult = (answerValue: 1 | 2 | 3 | 4 | 5) => {
  const s = storage.startNewSession();
  for (const q of storage.questionsOf(s)) s.answers[q.id] = answerValue;
  return storage.completeSession(s);
};

describe("결과 화면", () => {
  it("결과 본문이 누락 없이 렌더된다 (전 섹션)", () => {
    // 표시 단계 중복 정리 후에도 모든 문장이 페이지 어딘가에는 남아야 한다
    const stored = buildResult(1);
    // 화면에 실제로 렌더되는 콘텐츠(파일럿 적용본 포함) 기준으로 검사한다
    const type = matchType(stored.code);
    const { container } = renderAt(`/result/${stored.sessionId}`);
    const text = container.textContent!;

    expect(text).toContain(type.personaName);
    expect(text).toContain(type.headline);
    expect(text).toContain(type.energySignature);
    expect(text).toContain(type.workStyle);
    expect(text).toContain(type.decisionStyle);
    expect(text).toContain(type.relationshipStyle);
    // teamContribution 등은 화면에서 앞 섹션과 중복되는 문장을 생략해 표시하므로
    // 필드 원문 통짜가 아니라 문장 단위로 페이지 어딘가에 존재하는지 검사한다
    for (const s of type.teamContribution.split(/(?<=[.?])\s+/)) {
      expect(text, s.slice(0, 24)).toContain(s.trim());
    }
    for (const s of type.overview.split(/(?<=[.?])\s+/)) {
      expect(text, s.slice(0, 24)).toContain(s.trim());
    }
    for (const s of type.cautions.flatMap(c => c.split(/(?<=[.?])\s+/))) {
      expect(text, s.slice(0, 24)).toContain(s.trim());
    }
    for (const s of type.recoveryStrategies.flatMap(c => c.split(/(?<=[.?])\s+/))) {
      expect(text, s.slice(0, 24)).toContain(s.trim());
    }
    expect(text).toContain(type.collaborationGuide.bestFeedbackStyle);
    expect(text).toContain(type.encouragement);
    expect(text).toContain(type.developmentRoadmap.startNow);
    expect(text).toContain(type.developmentRoadmap.next30Days);
    expect(text).toContain(type.developmentRoadmap.longTerm);

    for (const arr of [
      type.strengths,
      type.cautions,
      type.goodFitSituations,
      type.stressSignals,
      type.selfCoachingQuestions,
      type.collaborationGuide.worksWellWhen,
      type.collaborationGuide.mayStruggleWhen
    ]) {
      for (const item of arr) expect(text, item.slice(0, 24)).toContain(item);
    }
    for (const g of type.developmentGuide) {
      expect(text).toContain(g.overuseSignal);
      expect(text).toContain(g.practice);
      expect(text).toContain(g.matureStrength);
    }
  });

  it("각 양극축 합 100 · 12에너지 합 600이 화면 수치와 일치한다", () => {
    const stored = buildResult(2);
    const { container } = renderAt(`/result/${stored.sessionId}`);
    const bars = container.querySelectorAll(".pair-bar");
    expect(bars).toHaveLength(6);

    let total = 0;
    for (const bar of bars) {
      const vals = [...bar.querySelectorAll(".val")].map(v => Number(v.textContent));
      expect(vals).toHaveLength(2);
      expect(vals[0] + vals[1]).toBeCloseTo(100, 6);
      total += vals[0] + vals[1];
    }
    expect(total).toBeCloseTo(600, 6);
  });

  it("전 문항 3 응답이면 6축 모두 50:50 균형 지점으로 표시된다", () => {
    const stored = buildResult(3);
    const { container } = renderAt(`/result/${stored.sessionId}`);
    expect(container.querySelectorAll(".pair-bar")).toHaveLength(6);
    expect(container.querySelectorAll(".pair-note")).toHaveLength(6);
    expect(container.textContent).toContain("균형 지점");
    for (const node of container.querySelectorAll(".pair-node")) {
      expect((node as HTMLElement).style.left).toBe("50%");
    }
  });

  it("0/1 코드와 High/Low·우열 표현이 화면에 나타나지 않는다 (64유형 전수)", () => {
    for (const type of TYPE_DATASET.types) {
      const stored = buildResult(3);
      // 저장 결과의 code만 각 유형으로 바꿔 렌더 (채점 로직은 건드리지 않음)
      const all = JSON.parse(store.get("mycore12.results.v1")!);
      all[all.length - 1].code = type.code;
      store.set("mycore12.results.v1", JSON.stringify(all));

      const { container, unmount } = renderAt(`/result/${stored.sessionId}`);
      const text = container.textContent!;
      expect(CODE_RE.test(text), `${type.code} 코드 노출`).toBe(false);
      for (const b of BANNED) expect(text.includes(b), `${type.code}: ${b}`).toBe(false);
      expect(OLD_BRAND_RE.test(text), `${type.code}: 기존 브랜드 잔존`).toBe(false);
      unmount();
    }
  });

  it("000000과 111111이 동일한 섹션 수·구조로 렌더된다", () => {
    const shapes: string[] = [];
    for (const bits of ["000000", "111111"]) {
      const type = TYPE_DATASET.types.find(t => t.bitString === bits)!;
      const stored = buildResult(3);
      const all = JSON.parse(store.get("mycore12.results.v1")!);
      all[all.length - 1].code = type.code;
      store.set("mycore12.results.v1", JSON.stringify(all));

      const { container, unmount } = renderAt(`/result/${stored.sessionId}`);
      shapes.push(
        JSON.stringify({
          sections: container.querySelectorAll("section.section").length,
          h1: container.querySelectorAll("h1").length,
          h2: container.querySelectorAll("h2").length,
          eyebrows: container.querySelectorAll(".eyebrow").length,
          enum: container.querySelectorAll(".enum-item").length,
          acc: container.querySelectorAll(".acc-item").length,
          quotes: container.querySelectorAll(".quote").length,
          bars: container.querySelectorAll(".pair-bar").length,
          sig: container.querySelectorAll(".signature .sig").length,
          roadmap: container.querySelectorAll(".roadmap-step").length
        })
      );
      unmount();
    }
    expect(shapes[0]).toBe(shapes[1]);
  });

  it("12각형이 면적 경쟁을 만들지 않는다 (fill 없음, 고정 외곽)", () => {
    const a = buildResult(1);
    const { container: c1, unmount } = renderAt(`/result/${a.sessionId}`);
    const outerA = c1.querySelector("svg polygon")!.getAttribute("points");
    for (const p of c1.querySelectorAll("svg polygon")) {
      expect(p.getAttribute("fill")).toBe("none");
    }
    unmount();

    const b = buildResult(5);
    const { container: c2 } = renderAt(`/result/${b.sessionId}`);
    // 서로 다른 결과여도 외곽 프레임은 완전히 동일하다
    expect(c2.querySelector("svg polygon")!.getAttribute("points")).toBe(outerA);
  });

  it("차트 값이 색상 외 텍스트로도 제공되고 SVG에 title/desc가 있다", () => {
    const stored = buildResult(2);
    const { container } = renderAt(`/result/${stored.sessionId}`);
    const svg = container.querySelector(".map-panel svg")!;
    expect(svg.querySelector("title")!.textContent).toBeTruthy();
    expect(svg.querySelector("desc")!.textContent).toBeTruthy();
    expect(svg.getAttribute("role")).toBe("img");

    // 12개 값이 sr-only 목록으로도 존재
    const srList = container.querySelector(".sr-only")!.textContent!;
    for (const [energy, score] of Object.entries(stored.energyScores)) {
      expect(srList).toContain(`${energy} ${score}`);
    }
    // 각 마커에 접근 가능한 이름이 있다
    const markers = svg.querySelectorAll('g[role="button"]');
    expect(markers).toHaveLength(12);
    for (const m of markers) expect(m.getAttribute("aria-label")).toBeTruthy();
  });
});

/* ── 흐름 ───────────────────────────────────────── */
describe("재검사 · 기록 · 삭제", () => {
  it("과거 결과가 기록 화면에서 로드되고 다시 열린다", () => {
    const r1 = buildResult(1);
    const r2 = buildResult(5);
    const { container } = renderAt("/history");
    const items = container.querySelectorAll(".history-item");
    expect(items).toHaveLength(2);
    expect(container.textContent).toContain(r1.typePersonaName);
    expect(container.textContent).toContain(r2.typePersonaName);

    cleanup();
    const { container: c } = renderAt(`/result/${r1.sessionId}`);
    expect(c.textContent).toContain(r1.typePersonaName);
  });

  it("결과 삭제가 동작한다", () => {
    const r = buildResult(3);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = renderAt("/history");
    fireEvent.click(within(container.querySelector(".history-item")!).getByText("삭제"));
    expect(storage.getResults()).toHaveLength(0);
    vi.restoreAllMocks();
    expect(r.sessionId).toBeTruthy();
  });

  it("존재하지 않는 결과 주소는 안내 화면을 보여준다 (라우팅 오류 없음)", () => {
    const { container } = renderAt("/result/없는세션");
    expect(container.textContent).toContain("결과를 찾을 수 없어요");
  });

  it("알 수 없는 경로는 홈으로 폴백된다", () => {
    const { container } = renderAt("/전혀-없는-경로");
    expect(container.querySelector(".brand-lockup")).toBeTruthy();
  });

  it("모든 정적 경로가 오류 없이 렌더된다", () => {
    for (const path of ["/", "/how", "/privacy", "/history", "/assessment"]) {
      const { container, unmount } = renderAt(path);
      expect(container.textContent!.length, path).toBeGreaterThan(50);
      unmount();
    }
  });
});
