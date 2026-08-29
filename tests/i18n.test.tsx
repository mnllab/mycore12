/**
 * 렌더 단위 최종 QA.
 * 실제 DOM을 그려 브랜드 표기, 결과 본문 누락, 접근성, 콘솔 오류를 확인한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LocaleProvider } from "../src/i18n/LocaleProvider";
import { hasQuestionOverlay, hasTypeOverlay, localizeQuestion, localizeType } from "../src/i18n/content";
import enQuestions from "../src/locales/en/questions.json";
import enTypes from "../src/locales/en/types.json";
import koUi from "../src/locales/ko/ui.json";
import enUi from "../src/locales/en/ui.json";
import koBank from "../src/data/positive_144_situational_question_bank_FINAL_v3.2.json";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ErrorBoundary from "../src/components/ErrorBoundary";
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
const { matchType, TYPE_DATASET } = await import("../src/lib/mycore12");

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
describe("locale 기본값과 저장", () => {
  it("기본 locale 은 ko 이고 브라우저 언어를 따라가지 않는다", () => {
    Object.defineProperty(navigator, "language", {
      value: "en-US",
      configurable: true
    });
    const { container } = renderAt("/");
    expect(document.documentElement.lang).toBe("ko");
    expect(container.textContent).toContain("검사 시작");
    expect(container.textContent).not.toContain("Start Assessment");
  });

  it("선택한 locale 을 mycore12.locale.v1 에 저장한다", () => {
    const { container } = renderAt("/");
    fireEvent.click(within(container.querySelector(".locale-switch")!).getByText("English"));
    expect(store.get("mycore12.locale.v1")).toBe("en");
  });

  it("새로고침(재마운트) 후 저장된 locale 이 복원된다", () => {
    store.set("mycore12.locale.v1", "en");
    const { container } = renderAt("/");
    expect(container.textContent).toContain("Start Assessment");
    expect(document.documentElement.lang).toBe("en");
  });

  it("ko → en → ko 전환이 모두 동작한다", () => {
    const { container } = renderAt("/");
    const sw = () => container.querySelector(".locale-switch")!;
    expect(container.textContent).toContain("검사 시작");

    fireEvent.click(within(sw()).getByText("English"));
    expect(container.textContent).toContain("Start Assessment");
    expect(document.documentElement.lang).toBe("en");

    fireEvent.click(within(sw()).getByText("한국어"));
    expect(container.textContent).toContain("검사 시작");
    expect(document.documentElement.lang).toBe("ko");
  });

  it("현재 선택된 언어가 분명히 표시된다", () => {
    const { container } = renderAt("/");
    const buttons = [...container.querySelectorAll(".locale-switch button")];
    expect(buttons.map(b => b.getAttribute("aria-pressed"))).toEqual(["true", "false"]);
  });
});

describe("document lang / metadata 전환", () => {
  it("locale 에 따라 title·description·og 가 갱신되고 ko 로 복원된다", () => {
    document.head.innerHTML = `
      <meta name="description" content="" />
      <meta property="og:title" content="" />
      <meta property="og:description" content="" />
      <meta property="og:locale" content="" />
      <meta name="twitter:title" content="" />
      <meta name="twitter:description" content="" />`;
    const { container } = renderAt("/");
    const get = (s: string) => document.querySelector(s)!.getAttribute("content");

    expect(document.title).toContain("마이코어12");
    expect(get('meta[property="og:locale"]')).toBe("ko_KR");

    fireEvent.click(
      within(container.querySelector(".locale-switch")!).getByText("English")
    );
    expect(document.documentElement.lang).toBe("en");
    expect(document.title).toBe("MYCORE12 | The 12 Energies That Shape You");
    expect(get('meta[property="og:locale"]')).toBe("en_US");
    expect(get('meta[name="description"]')).toContain("six paired preference axes");
    expect(get('meta[name="twitter:title"]')).toContain("MYCORE12");

    fireEvent.click(
      within(container.querySelector(".locale-switch")!).getByText("한국어")
    );
    expect(document.documentElement.lang).toBe("ko");
    expect(get('meta[property="og:locale"]')).toBe("ko_KR");
  });
});

describe("locale 전환은 검사 세션을 건드리지 않는다", () => {
  for (const length of [18, 36, 54, 72] as const) {
    it(`${length}문항: 진행 중 언어를 바꿔도 세션이 그대로다`, () => {
      const { container } = renderAt("/");
      fireEvent.click(
        [...container.querySelectorAll(".length-card")].find(el =>
          el.textContent!.includes(`${length}문항`)
        )!
      );
      fireEvent.click(screen.getByRole("button", { name: "검사 시작" }));

      // 몇 문항 응답한 뒤 상태를 캡처한다
      fireEvent.click(container.querySelectorAll(".v-scale .v-opt, .scale-h [role=radio]")[1]);
      const before = storage.getActiveSession()!;
      const snapshot = JSON.stringify({
        sessionId: before.sessionId,
        questionIds: before.questionIds,
        answers: before.answers,
        currentIndex: before.currentIndex,
        assessmentLength: before.assessmentLength
      });

      // 검사 화면에는 헤더가 없으므로 저장소를 통해 locale 을 바꾼 뒤 재마운트한다
      cleanup();
      store.set("mycore12.locale.v1", "en");
      renderAt("/assessment");

      const after = storage.getActiveSession()!;
      expect(
        JSON.stringify({
          sessionId: after.sessionId,
          questionIds: after.questionIds,
          answers: after.answers,
          currentIndex: after.currentIndex,
          assessmentLength: after.assessmentLength
        })
      ).toBe(snapshot);
    });
  }

  it("같은 응답이면 locale 과 무관하게 점수·code 가 같다", () => {
    const run = (locale: string) => {
      store.clear();
      store.set("mycore12.locale.v1", locale);
      const session = storage.startNewSession(18);
      // 문항 순서에 따라 결정되는 고정 응답 패턴
      session.answers = Object.fromEntries(
        session.questionIds.map((id, i) => [id, ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5])
      );
      const stored = storage.completeSession(session);
      return {
        code: stored.code,
        energyScores: stored.energyScores,
        questionIds: session.questionIds
      };
    };
    // 같은 문항 집합에 같은 응답을 주기 위해 questionIds 를 재사용한다
    const ko = run("ko");
    store.clear();
    store.set("mycore12.locale.v1", "en");
    const session = storage.startNewSession(18);
    session.questionIds = ko.questionIds;
    session.answers = Object.fromEntries(
      ko.questionIds.map((id, i) => [id, ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5])
    );
    const en = storage.completeSession(session);

    expect(en.code).toBe(ko.code);
    expect(en.energyScores).toEqual(ko.energyScores);
  });
});

describe("English 표시 매핑", () => {
  beforeEach(() => {
    store.set("mycore12.locale.v1", "en");
  });

  it("axis / energy 를 glossary 영문명으로 표시한다 (내부 key 는 한국어 유지)", () => {
    const stored = buildResult(2);
    const { container } = renderAt(`/result/${stored.sessionId}`);
    const text = container.textContent!;

    // 화면에는 영문 표시명이 나온다
    for (const label of ["Action", "Collaboration", "Thinking", "Judgment", "Relationships", "Organization"]) {
      expect(text, label).toContain(label);
    }
    for (const label of ["Initiative", "Deliberation", "Coordination", "Autonomy"]) {
      expect(text, label).toContain(label);
    }
    // 저장된 데이터의 내부 key 는 한국어 그대로다
    expect(Object.keys(stored.energyScores)).toContain("추진");
    expect(Object.keys(stored.energyScores)).toContain("숙고");
  });

  it("English 모드 UI 라벨이 EN UI copy 를 따른다", () => {
    const stored = buildResult(2);
    const { container } = renderAt(`/result/${stored.sessionId}`);
    const text = container.textContent!;
    for (const label of [
      "MYCORE12 Result",
      "My Core Profile",
      "My 12 Energies",
      "What Comes Naturally to Me",
      "At Work",
      "How I Make Decisions",
      "With Other People",
      "When a Strength Goes Too Far",
      "Using My Strengths More Broadly",
      "My Growth Roadmap",
      "Under Stress",
      "Regaining Balance",
      "Questions for Reflection",
      "Closing Note"
    ]) {
      expect(text, label).toContain(label);
    }
  });

  it("English 모드에서 날짜를 en-US 로 표기한다", () => {
    buildResult(2);
    const { container } = renderAt("/history");
    const meta = container.querySelector(".history-item .meta")!.textContent!;
    // ko-KR 표기(예: 2026. 8. 29.)가 아니라 en-US 표기여야 한다
    expect(/\d{1,2}\/\d{1,2}\/\d{4}/.test(meta), meta).toBe(true);
  });

  it("Stage 3 이후 유형 본문이 승인된 영문 overlay 로 표시된다", () => {
    const stored = buildResult(2);
    const { container } = renderAt(`/result/${stored.sessionId}`);
    const en = (enTypes as { code: string; personaName: string; headline: string }[])
      .find(t => t.code === stored.code)!;
    expect(container.textContent).toContain(en.personaName);
    expect(container.textContent).toContain(en.headline);
    expect(hasTypeOverlay("en")).toBe(true);
  });
});

describe("Assessment UI 는 locale 과 무관하게 유지된다", () => {
  it("영문 모드에서도 5단 value 순서와 indicator 대칭이 같다", () => {
    setViewport(375);
    store.set("mycore12.locale.v1", "en");
    for (let i = 0; i < 5; i++) {
      store.delete("mycore12.activeSession.v1");
      const { container, unmount } = renderAt("/assessment");
      const id = storage.getActiveSession()!.questionIds[0];
      const opts = container.querySelectorAll(".v-scale .v-opt");
      expect(opts).toHaveLength(5);
      fireEvent.click(opts[i]);
      expect(storage.getActiveSession()!.answers[id], `영문 ${i}번째`).toBe(i + 1);
      unmount();
    }

    store.delete("mycore12.activeSession.v1");
    const { container } = renderAt("/assessment");
    const dots = [...container.querySelectorAll(".v-scale .v-dot")] as HTMLElement[];
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
    expect(
      [...container.querySelectorAll(".v-opt-label")].map(e => e.textContent)
    ).toEqual([
      "Very true for me",
      "Somewhat true for me",
      "Both are about the same",
      "Somewhat true for me",
      "Very true for me"
    ]);
    setViewport(1024);
  });

  it("영문 모드 데스크톱 척도도 구조가 같다", () => {
    setViewport(1024);
    store.set("mycore12.locale.v1", "en");
    const { container } = renderAt("/assessment");
    expect(container.querySelector(".choice-pair")).not.toBeNull();
    const dots = [...container.querySelectorAll(".scale-h .dot")] as HTMLElement[];
    expect(dots.map(d => d.className.replace("dot ", ""))).toEqual([
      "strong",
      "soft",
      "neutral",
      "soft",
      "strong"
    ]);
    // English 모드에서도 A/B 라는 글자를 사용자에게 노출하지 않는다
    expect(/(^|\s)[AB](\s|$)/.test(container.textContent!)).toBe(false);
  });
});

describe("저장된 결과와 locale", () => {
  it("저장된 personaName 이 아니라 code 로 현재 유형을 찾아 표시한다", () => {
    const stored = buildResult(2);
    // 저장 시점 이름을 임의 문자열로 바꿔도 화면은 code 기준 이름을 쓴다
    const all = JSON.parse(store.get("mycore12.results.v1")!);
    all[all.length - 1].typePersonaName = "STALE-NAME";
    store.set("mycore12.results.v1", JSON.stringify(all));

    const { container } = renderAt("/history");
    expect(container.textContent).not.toContain("STALE-NAME");
    const type = matchType(stored.code);
    expect(container.textContent).toContain(type.personaName);
  });
});

describe("헤더 레이아웃과 후원 링크", () => {
  it("320~430px 에서 언어 선택 + nav 가 모두 존재한다", () => {
    for (const px of [320, 360, 375, 390, 412, 430]) {
      setViewport(px);
      for (const loc of ["ko", "en"]) {
        store.clear();
        store.set("mycore12.locale.v1", loc);
        const { container, unmount } = renderAt("/");
        const nav = container.querySelector(".header-nav")!;
        const sw = container.querySelector(".locale-switch")!;
        expect(sw, `${px}/${loc} locale switch`).not.toBeNull();
        expect(sw.querySelectorAll("button"), `${px}/${loc}`).toHaveLength(2);
        expect(nav.querySelector("a.donate"), `${px}/${loc} donate`).not.toBeNull();
        expect(
          nav.querySelector('a.donate')!.getAttribute("href"),
          "donate URL"
        ).toBe("https://www.buymeacoffee.com/mnledu");
        // 후원 축약 텍스트가 locale 을 따른다
        expect(
          nav.querySelector(".donate-text")!.textContent,
          `${px}/${loc} support text`
        ).toBe(loc === "ko" ? "후원" : "Support");
        unmount();
      }
    }
    setViewport(1024);
  });

  it("English 모드 헤더에 마이코어12를 주 브랜드로 쓰지 않는다", () => {
    store.set("mycore12.locale.v1", "en");
    const { container } = renderAt("/");
    const header = container.querySelector(".site-header")!;
    expect(header.textContent).toContain("MYCORE12");
    expect(header.querySelector(".wordmark")!.textContent).not.toContain("마이코어12");
  });
});

/* ══════════════════════════════════════════════════
   Stage 2 — 영문 문항 overlay
   ══════════════════════════════════════════════════ */
describe("영문 문항 overlay 무결성", () => {
  const overlay = enQuestions as {
    id: string;
    scenario: string;
    prompt: string;
    optionA: string;
    optionB: string;
  }[];
  const koActive = (koBank as { questions: Record<string, unknown>[] }).questions.filter(
    q => q.active
  ) as unknown as { id: string; scenario: string; optionA: string; optionB: string }[];

  it("정확히 144개이고 중복 ID 가 없다", () => {
    expect(overlay).toHaveLength(144);
    expect(new Set(overlay.map(q => q.id)).size).toBe(144);
    expect(hasQuestionOverlay("en")).toBe(true);
  });

  it("한국어 v3.2 은행의 active 144개 ID 와 정확히 일치한다", () => {
    expect(koActive).toHaveLength(144);
    expect(overlay.map(q => q.id)).toEqual(koActive.map(q => q.id));
  });

  it("모든 항목의 표시 필드가 비어 있지 않다", () => {
    for (const q of overlay) {
      for (const f of ["scenario", "prompt", "optionA", "optionB"] as const) {
        expect(String(q[f]).trim().length, `${q.id}.${f}`).toBeGreaterThan(0);
      }
    }
  });

  it("채점·구조 필드를 포함하지 않는다", () => {
    const allowed = new Set(["id", "scenario", "prompt", "optionA", "optionB"]);
    const banned = [
      "axis", "axisLabel", "pole1", "pole0", "context", "contextLabel",
      "optionAValue", "optionBValue", "responseScale", "active",
      "status", "contentReview", "itemVersion", "psychometricStatus"
    ];
    for (const q of overlay) {
      for (const k of Object.keys(q)) expect(allowed.has(k), `${q.id}: ${k}`).toBe(true);
      for (const b of banned) expect(b in q, `${q.id}: ${b}`).toBe(false);
    }
  });

  it("overlay 적용은 표시 문구만 바꾸고 채점 필드는 원본을 유지한다", () => {
    for (const base of storage.questionsOf(storage.startNewSession(72))) {
      const en = localizeQuestion(base, "en");
      const src = overlay.find(q => q.id === base.id)!;
      // 표시 문구는 승인본과 정확히 일치
      expect(en.scenario, base.id).toBe(src.scenario);
      expect(en.prompt, base.id).toBe(src.prompt);
      expect(en.optionA, base.id).toBe(src.optionA);
      expect(en.optionB, base.id).toBe(src.optionB);
      // 채점·구조 필드는 한국어 base 그대로
      expect(en.id).toBe(base.id);
      expect(en.axis).toBe(base.axis);
      expect(en.context).toBe(base.context);
      expect(en.optionAValue).toBe(base.optionAValue);
      expect(en.optionBValue).toBe(base.optionBValue);
      expect(en.responseScale).toEqual(base.responseScale);
      expect(en.active).toBe(base.active);
    }
  });
});

describe("Stage 2 — 검사 화면의 문항 언어", () => {
  it("English 모드는 승인된 영문 문항을 보여준다", () => {
    store.set("mycore12.locale.v1", "en");
    const { container } = renderAt("/assessment");
    const base = storage.questionsOf(storage.getActiveSession()!)[0];
    const src = (enQuestions as { id: string; scenario: string; optionA: string; optionB: string }[])
      .find(q => q.id === base.id)!;
    const text = container.textContent!;
    expect(text).toContain(src.scenario);
    expect(text).toContain(src.optionA);
    expect(text).toContain(src.optionB);
    expect(text).toContain("I usually...");
    // 문항 영역에 한국어 원문이 남지 않는다
    expect(text).not.toContain(base.scenario);
  });

  it("한국어 모드는 원본 한국어 문항을 그대로 보여준다", () => {
    const { container } = renderAt("/assessment");
    const base = storage.questionsOf(storage.getActiveSession()!)[0];
    const text = container.textContent!;
    expect(text).toContain(base.scenario);
    expect(text).toContain(base.optionA);
    expect(text).toContain(base.optionB);
  });

  it("ko → en → ko 전환에도 세션이 그대로다", () => {
    const { container } = renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "검사 시작" }));
    fireEvent.click(container.querySelectorAll(".v-scale .v-opt, .scale-h [role=radio]")[1]);

    const snap = (s: NonNullable<ReturnType<typeof storage.getActiveSession>>) =>
      JSON.stringify({
        sessionId: s.sessionId,
        questionIds: s.questionIds,
        answers: s.answers,
        currentIndex: s.currentIndex,
        assessmentLength: s.assessmentLength
      });
    const before = snap(storage.getActiveSession()!);

    cleanup();
    store.set("mycore12.locale.v1", "en");
    renderAt("/assessment");
    expect(snap(storage.getActiveSession()!), "en 전환 후").toBe(before);

    cleanup();
    store.set("mycore12.locale.v1", "ko");
    renderAt("/assessment");
    expect(snap(storage.getActiveSession()!), "ko 복귀 후").toBe(before);
  });

  it("같은 문항·같은 응답이면 ko/en 채점 결과가 완전히 같다", () => {
    const base = storage.startNewSession(36);
    const ids = base.questionIds;
    const answers = Object.fromEntries(
      ids.map((id, i) => [id, ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5])
    );

    const run = (locale: string) => {
      store.clear();
      store.set("mycore12.locale.v1", locale);
      const s = storage.startNewSession(36);
      s.questionIds = ids;
      s.answers = answers;
      return storage.completeSession(s);
    };
    const ko = run("ko");
    const en = run("en");

    expect(en.code).toBe(ko.code);
    expect(en.energyScores).toEqual(ko.energyScores);
    expect(en.axisResults).toEqual(ko.axisResults);
  });

  it("English 모바일에서도 5단 세로 응답과 값 순서가 유지된다", () => {
    setViewport(375);
    store.set("mycore12.locale.v1", "en");
    for (let i = 0; i < 5; i++) {
      store.delete("mycore12.activeSession.v1");
      const { container, unmount } = renderAt("/assessment");
      const id = storage.getActiveSession()!.questionIds[0];
      const opts = container.querySelectorAll(".v-scale .v-opt");
      expect(opts).toHaveLength(5);
      fireEvent.click(opts[i]);
      expect(storage.getActiveSession()!.answers[id]).toBe(i + 1);
      unmount();
    }
    setViewport(1024);
  });
});

describe("Stage 2 — 브랜드 그래픽과 검사 헤더", () => {
  const KO_ENERGIES = ["추진", "숙고", "조율", "자율", "창의", "구체", "분석", "통합", "공감", "명료", "원칙", "유연"];
  const EN_ENERGIES = ["Initiative", "Deliberation", "Coordination", "Autonomy", "Creativity", "Practicality", "Analysis", "Integration", "Empathy", "Clarity", "Structure", "Flexibility"];

  it("English OrbitGraphic 은 영문 라벨만 보여준다", () => {
    store.set("mycore12.locale.v1", "en");
    const { container } = renderAt("/");
    const svg = container.querySelector(".hero-orbit svg")!;
    const text = svg.textContent!;
    for (const e of EN_ENERGIES) expect(text, e).toContain(e);
    for (const e of KO_ENERGIES) expect(text.includes(e), `한국어 잔존: ${e}`).toBe(false);
    expect(svg.getAttribute("aria-label")).toContain("MYCORE12");
    expect(/[가-힣]/.test(svg.getAttribute("aria-label")!)).toBe(false);
  });

  it("한국어 OrbitGraphic 은 한국어 라벨을 그대로 보여준다", () => {
    const { container } = renderAt("/");
    const svg = container.querySelector(".hero-orbit svg")!;
    for (const e of KO_ENERGIES) expect(svg.textContent, e).toContain(e);
    expect(svg.getAttribute("aria-label")).toContain("마이코어12");
  });

  it("English 검사 헤더는 MYCORE12 만 표시한다", () => {
    store.set("mycore12.locale.v1", "en");
    const { container } = renderAt("/assessment");
    const brand = container.querySelector(".assess-top .brand")!;
    expect(brand.textContent).toContain("MYCORE12");
    expect(brand.textContent).not.toContain("마이코어12");
  });

  it("한국어 검사 헤더는 마이코어12 + MYCORE12 를 표시한다", () => {
    const { container } = renderAt("/assessment");
    const brand = container.querySelector(".assess-top .brand")!;
    expect(brand.textContent).toContain("마이코어12");
    expect(brand.textContent).toContain("MYCORE12");
  });
});

/* ══════════════════════════════════════════════════
   Stage 3 — 영문 64유형 결과 콘텐츠 overlay
   ══════════════════════════════════════════════════ */
describe("영문 유형 overlay 무결성", () => {
  type EnType = {
    code: string;
    personaName: string;
    overview: string;
    strengths: string[];
    goodFitSituations: string[];
    cautions: string[];
    stressSignals: string[];
    recoveryStrategies: string[];
    selfCoachingQuestions: string[];
    collaborationGuide: { worksWellWhen: string[]; mayStruggleWhen: string[] };
    developmentGuide: { primaryEnergy: string; supportEnergy: string }[];
  };
  const overlay = enTypes as unknown as EnType[];
  const base = TYPE_DATASET.types;

  it("정확히 64개이고 code 가 모두 고유하다", () => {
    expect(overlay).toHaveLength(64);
    expect(new Set(overlay.map(t => t.code)).size).toBe(64);
    expect(hasTypeOverlay("en")).toBe(true);
    expect(hasQuestionOverlay("en")).toBe(true);
  });

  it("한국어 기준 데이터셋의 code set 과 정확히 일치한다", () => {
    expect(new Set(overlay.map(t => t.code))).toEqual(new Set(base.map(t => t.code)));
  });

  it("personaName 이 64개 모두 비어 있지 않고 서로 다르다", () => {
    const names = overlay.map(t => t.personaName);
    for (const n of names) expect(n.trim().length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(64);
  });

  it("각 overview 에 해당 English personaName 이 포함된다 (문단 분할 기준)", () => {
    for (const t of overlay) {
      expect(t.overview.includes(t.personaName), t.code).toBe(true);
    }
  });

  it("항목 수가 기준과 일치한다", () => {
    const counts: [keyof EnType, number][] = [
      ["strengths", 9],
      ["goodFitSituations", 6],
      ["cautions", 7],
      ["developmentGuide", 6],
      ["stressSignals", 5],
      ["recoveryStrategies", 4],
      ["selfCoachingQuestions", 4]
    ];
    for (const t of overlay) {
      for (const [field, n] of counts) {
        expect((t[field] as unknown[]).length, `${t.code}.${String(field)}`).toBe(n);
      }
      expect(t.collaborationGuide.worksWellWhen, t.code).toHaveLength(5);
      expect(t.collaborationGuide.mayStruggleWhen, t.code).toHaveLength(3);
    }
  });

  it("developmentGuide 의 에너지 key 가 한국어 base 와 정확히 같다", () => {
    const byCode = new Map(base.map(t => [t.code, t]));
    for (const t of overlay) {
      const b = byCode.get(t.code)!;
      expect(
        t.developmentGuide.map(g => [g.primaryEnergy, g.supportEnergy]),
        t.code
      ).toEqual(b.developmentGuide.map(g => [g.primaryEnergy, g.supportEnergy]));
    }
  });

  it("구조 필드를 overlay 가 덮지 않는다 (내부 key 는 한국어 유지)", () => {
    for (const t of base) {
      const en = localizeType(t, "en");
      expect(en.typeNumber).toBe(t.typeNumber);
      expect(en.bitString).toBe(t.bitString);
      expect(en.code).toBe(t.code);
      expect(en.typeName).toBe(t.typeName);
      expect(en.preferredEnergies).toEqual(t.preferredEnergies);
      expect(en.supportingEnergies).toEqual(t.supportingEnergies);
      expect(en.axisPreferences).toEqual(t.axisPreferences);
      // 한국어 모드는 원본 그대로
      expect(localizeType(t, "ko").personaName).toBe(t.personaName);
    }
  });
});

describe("Stage 3 — 영문 결과 화면 렌더", () => {
  const CODES = ["0-0-0-0-0-0", "0-1-0-1-1-0", "1-0-1-0-1-1", "1-1-1-1-1-1"];
  const KO_ENERGIES = ["추진", "숙고", "조율", "자율", "창의", "구체", "분석", "통합", "공감", "명료", "원칙", "유연"];

  for (const code of CODES) {
    it(`${code}: 결과 본문이 전부 영문 overlay 로 표시된다`, () => {
      const stored = buildResult(2);
      const all = JSON.parse(store.get("mycore12.results.v1")!);
      all[all.length - 1].code = code;
      store.set("mycore12.results.v1", JSON.stringify(all));
      store.set("mycore12.locale.v1", "en");

      const { container } = renderAt(`/result/${stored.sessionId}`);
      const text = container.textContent!;
      const en = (enTypes as unknown as Record<string, never>[]).find(
        t => (t as { code: string }).code === code
      ) as unknown as {
        personaName: string;
        headline: string;
        strengths: string[];
        workStyle: string;
        decisionStyle: string;
        relationshipStyle: string;
        teamContribution: string;
        cautions: string[];
        goodFitSituations: string[];
        stressSignals: string[];
        recoveryStrategies: string[];
        selfCoachingQuestions: string[];
        encouragement: string;
        interpretationNote: string;
        collaborationGuide: { worksWellWhen: string[]; bestFeedbackStyle: string };
        developmentRoadmap: Record<string, string>;
      };

      expect(text, "personaName").toContain(en.personaName);
      expect(text, "headline").toContain(en.headline);
      expect(text, "workStyle").toContain(en.workStyle);
      expect(text, "decisionStyle").toContain(en.decisionStyle);
      expect(text, "relationshipStyle").toContain(en.relationshipStyle);
      expect(text, "encouragement").toContain(en.encouragement);
      expect(text, "interpretationNote").toContain(en.interpretationNote);
      expect(text, "feedback").toContain(en.collaborationGuide.bestFeedbackStyle);
      for (const s of en.strengths) expect(text, "strengths").toContain(s);
      for (const s of en.goodFitSituations) expect(text, "goodFit").toContain(s);
      for (const s of en.cautions) expect(text, "cautions").toContain(s);
      for (const s of en.stressSignals) expect(text, "stress").toContain(s);
      for (const s of en.selfCoachingQuestions) expect(text, "questions").toContain(s);
      for (const s of en.collaborationGuide.worksWellWhen) expect(text, "worksWell").toContain(s);
      for (const s of Object.values(en.developmentRoadmap)) expect(text, "roadmap").toContain(s);

      // 6개 signature energy 가 영어 표시명으로 나온다
      const type = matchType(code);
      for (const e of type.preferredEnergies) {
        expect(text, `signature ${e}`).not.toContain(e);
      }
      // 사용자 표시 영역에 한국어 에너지명이 남지 않는다
      for (const e of KO_ENERGIES) {
        expect(text.includes(e), `한국어 잔존: ${e}`).toBe(false);
      }
      // 내부 코드도 노출되지 않는다
      expect(/\d-\d-\d-\d-\d-\d|bitString/.test(text)).toBe(false);
    });
  }

  it("한국어 모드에서는 기존 한국어 결과가 그대로다", () => {
    const stored = buildResult(2);
    const { container } = renderAt(`/result/${stored.sessionId}`);
    const type = matchType(stored.code);
    expect(container.textContent).toContain(type.personaName);
    expect(container.textContent).toContain(type.headline);
  });
});

describe("Stage 3 — 언어 전환은 저장 결과를 바꾸지 않는다", () => {
  it("ko → en → ko 전환 시 점수·code·결과 개수가 그대로다", () => {
    const stored = buildResult(2);
    const snapshot = JSON.stringify(storage.getResults());

    const koRender = renderAt(`/result/${stored.sessionId}`);
    const koType = matchType(stored.code);
    expect(koRender.container.textContent).toContain(koType.personaName);
    cleanup();

    store.set("mycore12.locale.v1", "en");
    const enRender = renderAt(`/result/${stored.sessionId}`);
    const enType = (enTypes as unknown as { code: string; personaName: string }[]).find(
      t => t.code === stored.code
    )!;
    expect(enRender.container.textContent).toContain(enType.personaName);
    cleanup();

    store.set("mycore12.locale.v1", "ko");
    renderAt(`/result/${stored.sessionId}`);

    // 저장 데이터는 언어 전환과 무관하게 완전히 동일하다
    expect(JSON.stringify(storage.getResults())).toBe(snapshot);
    expect(storage.getResults()).toHaveLength(1);
  });

  it("History 는 저장된 이름이 아니라 code 로 locale 이름을 찾는다", () => {
    const stored = buildResult(2);
    const all = JSON.parse(store.get("mycore12.results.v1")!);
    all[all.length - 1].typePersonaName = "STALE-KO-NAME";
    store.set("mycore12.results.v1", JSON.stringify(all));
    store.set("mycore12.locale.v1", "en");

    const { container } = renderAt("/history");
    const enType = (enTypes as unknown as { code: string; personaName: string }[]).find(
      t => t.code === stored.code
    )!;
    expect(container.textContent).toContain(enType.personaName);
    expect(container.textContent).not.toContain("STALE-KO-NAME");
  });
});

/* ══════════════════════════════════════════════════
   Stage 4 — 최종 QA (리소스 parity · 잔존 한국어 · 전수 렌더)
   ══════════════════════════════════════════════════ */

/** 중첩 객체/배열의 leaf key path 를 모두 모은다 */
const leafPaths = (value: unknown, prefix = ""): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => leafPaths(v, `${prefix}[${i}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      leafPaths(v, prefix ? `${prefix}.${k}` : k)
    );
  }
  return [prefix];
};

describe("ko / en UI 리소스 구조 동등성", () => {
  it("leaf key path 가 정확히 같다 (배열 내부 구조 포함)", () => {
    const ko = leafPaths(koUi).sort();
    const en = leafPaths(enUi).sort();
    const missingInEn = ko.filter(k => !en.includes(k));
    const missingInKo = en.filter(k => !ko.includes(k));
    expect(missingInEn, `en 누락: ${missingInEn.join(", ")}`).toEqual([]);
    expect(missingInKo, `ko 누락: ${missingInKo.join(", ")}`).toEqual([]);
    expect(en).toEqual(ko);
  });

  it("모든 leaf 값이 비어 있지 않은 문자열이다", () => {
    for (const ui of [koUi, enUi]) {
      const walk = (v: unknown, p = ""): void => {
        if (Array.isArray(v)) return void v.forEach((x, i) => walk(x, `${p}[${i}]`));
        if (v && typeof v === "object") {
          return void Object.entries(v as Record<string, unknown>).forEach(([k, x]) =>
            walk(x, p ? `${p}.${k}` : k)
          );
        }
        expect(typeof v, p).toBe("string");
        expect(String(v).trim().length, p).toBeGreaterThan(0);
      };
      walk(ui);
    }
  });

  it("Stage 4 에서 보완한 5개 key 가 실제 값을 갖는다", () => {
    const en = enUi as unknown as Record<string, Record<string, string>>;
    expect(en.nav.principle).toBe("Assessment Principles");
    expect(en.nav.localeAria).toBe("Language selection");
    expect(en.assessment.scaleMuch).toBe("Much more");
    expect(en.assessment.scaleLittle).toBe("A little more");
    expect(en.assessment.scaleSame).toBe("About the same");
  });

  it("English 푸터의 검사 원리 링크와 언어 선택 aria 가 비어 있지 않다", () => {
    store.set("mycore12.locale.v1", "en");
    const { container } = renderAt("/");
    const principleLink = [...container.querySelectorAll(".site-footer .links a")].find(
      a => a.getAttribute("href")?.includes("/how")
    )!;
    expect(principleLink.textContent!.trim()).toBe("Assessment Principles");
    expect(
      container.querySelector(".locale-switch")!.getAttribute("aria-label")
    ).toBe("Language selection");
  });
});

describe("English 화면 잔존 한국어 검수", () => {
  const KO_ENERGIES = ["추진", "숙고", "조율", "자율", "창의", "구체", "분석", "통합", "공감", "명료", "원칙", "유연"];
  const KO_AXES = ["행동", "협업", "사고", "판단", "관계", "운영"];
  /** 언어 선택기의 "한국어" 라벨만 의도적으로 허용한다 */
  const stripAllowed = (s: string) => s.split("한국어").join("");
  const hangul = (s: string) => s.match(/[가-힣]+/g) ?? [];

  beforeEach(() => {
    store.set("mycore12.locale.v1", "en");
  });

  for (const path of ["/", "/how", "/privacy", "/history"]) {
    it(`${path} 화면에 한국어가 남지 않는다`, () => {
      const { container } = renderAt(path);
      const found = hangul(stripAllowed(container.textContent!));
      expect(found, `${path}: ${found.join(", ")}`).toEqual([]);
    });
  }

  it("검사 화면(문항 포함)에 한국어가 남지 않는다", () => {
    const { container } = renderAt("/assessment");
    const found = hangul(stripAllowed(container.textContent!));
    expect(found, found.join(", ")).toEqual([]);
  });

  it("결과 화면에 한국어 축·에너지 이름이 남지 않는다", () => {
    const stored = buildResult(2);
    const { container } = renderAt(`/result/${stored.sessionId}`);
    const text = container.textContent!;
    for (const w of [...KO_ENERGIES, ...KO_AXES]) {
      expect(text.includes(w), `잔존: ${w}`).toBe(false);
    }
    expect(hangul(stripAllowed(text))).toEqual([]);
  });

  it("접근성 이름(aria-label/title/alt)에도 한국어가 남지 않는다", () => {
    for (const path of ["/", "/assessment"]) {
      const { container, unmount } = renderAt(path);
      const attrs = [...container.querySelectorAll("*")].flatMap(el =>
        ["aria-label", "alt", "title"]
          .map(a => el.getAttribute(a))
          .filter((v): v is string => Boolean(v))
      );
      const svgTitles = [...container.querySelectorAll("title, desc")].map(
        e => e.textContent ?? ""
      );
      const found = hangul(stripAllowed([...attrs, ...svgTitles].join(" ")));
      expect(found, `${path}: ${found.join(", ")}`).toEqual([]);
      unmount();
    }
  });

  it("내부 데이터 key 는 한국어를 그대로 유지한다 (번역으로 해결하지 않는다)", () => {
    const stored = buildResult(2);
    expect(Object.keys(stored.energyScores).sort()).toEqual([...KO_ENERGIES].sort());
    expect(stored.preferredEnergies.every(e => KO_ENERGIES.includes(e))).toBe(true);
    const type = matchType(stored.code);
    expect(type.developmentGuide.every(g => KO_ENERGIES.includes(g.primaryEnergy))).toBe(true);
  });
});

describe("64유형 English 결과 전수 렌더 QA", () => {
  it("64개 code 전부가 영문 콘텐츠로 정상 렌더된다", () => {
    const overlay = new Map(
      (enTypes as unknown as Record<string, unknown>[]).map(t => [t.code as string, t])
    );
    const problems: string[] = [];

    for (const base of TYPE_DATASET.types) {
      store.clear();
      store.set("mycore12.locale.v1", "en");
      const stored = buildResult(2);
      const all = JSON.parse(store.get("mycore12.results.v1")!);
      all[all.length - 1].code = base.code;
      store.set("mycore12.results.v1", JSON.stringify(all));

      const { container, unmount } = renderAt(`/result/${stored.sessionId}`);
      const text = container.textContent!;
      const en = overlay.get(base.code) as unknown as {
        personaName: string;
        headline: string;
        overview: string;
        strengths: string[];
        workStyle: string;
        decisionStyle: string;
        relationshipStyle: string;
        teamContribution: string;
        goodFitSituations: string[];
        cautions: string[];
        stressSignals: string[];
        recoveryStrategies: string[];
        selfCoachingQuestions: string[];
        encouragement: string;
        interpretationNote: string;
        collaborationGuide: {
          worksWellWhen: string[];
          mayStruggleWhen: string[];
          bestFeedbackStyle: string;
        };
        developmentGuide: { whyItHelps: string; practice: string; matureStrength: string }[];
        developmentRoadmap: Record<string, string>;
      };

      const need: [string, string][] = [
        ["personaName", en.personaName],
        ["headline", en.headline],
        ["workStyle", en.workStyle],
        ["decisionStyle", en.decisionStyle],
        ["relationshipStyle", en.relationshipStyle],
        ["encouragement", en.encouragement],
        ["interpretationNote", en.interpretationNote],
        ["bestFeedbackStyle", en.collaborationGuide.bestFeedbackStyle]
      ];
      for (const [label, value] of need) {
        if (!text.includes(value)) problems.push(`${base.code}: ${label}`);
      }
      const lists: [string, string[]][] = [
        ["strengths", en.strengths],
        ["goodFitSituations", en.goodFitSituations],
        ["cautions", en.cautions],
        ["stressSignals", en.stressSignals],
        ["selfCoachingQuestions", en.selfCoachingQuestions],
        ["worksWellWhen", en.collaborationGuide.worksWellWhen],
        ["mayStruggleWhen", en.collaborationGuide.mayStruggleWhen],
        ["roadmap", Object.values(en.developmentRoadmap)],
        ["developmentGuide", en.developmentGuide.map(g => g.whyItHelps)]
      ];
      for (const [label, values] of lists) {
        for (const v of values) {
          if (!text.includes(v)) problems.push(`${base.code}: ${label}`);
        }
      }
      // recoveryStrategies 는 성장 로드맵과 겹치는 문장을 표시 단계에서 생략하므로
      // (Stage 1 중복 제거 helper) 문장 단위로 페이지 어딘가에 있으면 정상이다
      for (const s of en.recoveryStrategies.flatMap(x => x.split(/(?<=[.?])\s+/))) {
        if (s.trim() && !text.includes(s.trim())) {
          problems.push(`${base.code}: recoveryStrategies`);
        }
      }
      // overview 는 문단 분할 후에도 전체 문장이 화면에 남아야 한다
      for (const s of en.overview.split(/(?<=[.?])\s+/)) {
        if (s.trim() && !text.includes(s.trim())) problems.push(`${base.code}: overview`);
      }
      // 내부 표현이 노출되면 실패
      if (/\d-\d-\d-\d-\d-\d/.test(text)) problems.push(`${base.code}: 내부 code 노출`);
      if (/\bbitString\b/.test(text)) problems.push(`${base.code}: bitString 노출`);
      if (/\b(High|Low)\b/.test(text)) problems.push(`${base.code}: High/Low 표현`);

      unmount();
    }

    expect([...new Set(problems)], problems.slice(0, 8).join(" | ")).toEqual([]);
  }, 120000);
});

describe("Stage 4 — 저장 결과 호환성과 메타데이터", () => {
  it("언어 전환만으로 저장 결과가 다시 저장되지 않는다", () => {
    const stored = buildResult(2);
    const before = store.get("mycore12.results.v1")!;

    renderAt(`/result/${stored.sessionId}`);
    cleanup();
    store.set("mycore12.locale.v1", "en");
    renderAt(`/result/${stored.sessionId}`);
    cleanup();
    store.set("mycore12.locale.v1", "ko");
    renderAt(`/result/${stored.sessionId}`);

    expect(store.get("mycore12.results.v1")).toBe(before);
  });

  it("ko 날짜는 ko-KR, en 날짜는 en-US 형식이다", () => {
    buildResult(2);
    const koRender = renderAt("/history");
    const koMeta = koRender.container.querySelector(".history-item .meta")!.textContent!;
    expect(/\d{4}\.\s?\d{1,2}\.\s?\d{1,2}\./.test(koMeta), koMeta).toBe(true);
    cleanup();

    store.set("mycore12.locale.v1", "en");
    const enRender = renderAt("/history");
    const enMeta = enRender.container.querySelector(".history-item .meta")!.textContent!;
    expect(/\d{1,2}\/\d{1,2}\/\d{4}/.test(enMeta), enMeta).toBe(true);
  });
});

/* ══════════════════════════════════════════════════
   Release fix — i18n 예외 경로 2곳
   ══════════════════════════════════════════════════ */
describe("예외 경로에서도 한국어가 노출되지 않는다", () => {
  it("ErrorBoundary 는 raw error.message 를 화면에 표시하지 않는다", () => {
    const source = readFileSync(
      join(__dirname, "../src/components/ErrorBoundary.tsx"),
      "utf8"
    );
    // 사용자 DOM 에는 내부 메시지를 렌더하지 않는다
    expect(source.includes("this.state.error.message")).toBe(false);
    // 개발자 콘솔용 로깅은 그대로 유지한다
    expect(source).toContain('console.error("[MYCORE12]", error)');
    // 화면 문구는 locale 리소스만 사용한다
    expect(source).toContain("t.errors.boundaryTitle");
    expect(source).toContain("t.errors.boundaryBody");
    expect(source).toContain("t.errors.goHome");
  });

  it("English ErrorBoundary 화면에 한국어 내부 오류 메시지가 나오지 않는다", () => {
    const Boom = () => {
      throw new Error("세션 복원 실패: 문항 XX-99 를 찾을 수 없습니다.");
    };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <LocaleProvider>
        <MemoryRouter>
          <ErrorBoundary>
            <Boom />
          </ErrorBoundary>
        </MemoryRouter>
      </LocaleProvider>
    );
    // 기본 locale 은 ko 이므로 en 으로 바꿔 다시 렌더한다
    cleanup();
    store.set("mycore12.locale.v1", "en");
    const en = render(
      <LocaleProvider>
        <MemoryRouter>
          <ErrorBoundary>
            <Boom />
          </ErrorBoundary>
        </MemoryRouter>
      </LocaleProvider>
    );

    const text = en.container.textContent!;
    expect(text).toContain("Something Went Wrong");
    expect(text).not.toContain("세션 복원 실패");
    expect(/[가-힣]/.test(text), text).toBe(false);
    // ko 화면에도 내부 메시지는 노출되지 않는다
    expect(container.textContent).not.toContain("세션 복원 실패");
    // 개발자 콘솔에는 실제 오류가 남는다
    expect(spy.mock.calls.some(c => String(c[0]).includes("[MYCORE12]"))).toBe(true);
    spy.mockRestore();
  });

  it("English History 는 매칭 실패한 결과에 한국어 저장 이름을 쓰지 않는다", () => {
    const stored = buildResult(2);
    const all = JSON.parse(store.get("mycore12.results.v1")!);
    // 현재 유형 데이터에 없는 code + 과거 한국어 이름을 강제로 넣는다
    all[all.length - 1].code = "9-9-9-9-9-9";
    all[all.length - 1].typePersonaName = "차분한 현실 조정자";
    store.set("mycore12.results.v1", JSON.stringify(all));
    store.set("mycore12.locale.v1", "en");

    const { container } = renderAt("/history");
    const name = container.querySelector(".history-item .name")!.textContent!;
    expect(name).not.toContain("차분한 현실 조정자");
    expect(/[가-힣]/.test(name), name).toBe(false);
    expect(name).toBe("Unable to Display This Result");
    expect(stored.sessionId).toBeTruthy();
  });

  it("한국어 History 는 매칭 실패 시 기존 저장 이름을 그대로 보여준다", () => {
    buildResult(2);
    const all = JSON.parse(store.get("mycore12.results.v1")!);
    all[all.length - 1].code = "9-9-9-9-9-9";
    all[all.length - 1].typePersonaName = "차분한 현실 조정자";
    store.set("mycore12.results.v1", JSON.stringify(all));

    const { container } = renderAt("/history");
    expect(container.querySelector(".history-item .name")!.textContent).toBe(
      "차분한 현실 조정자"
    );
  });
});
