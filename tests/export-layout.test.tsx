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
const { matchType, AXES } = await import("../src/lib/mycore12");

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

const { energyLabel } = await import("../src/i18n/resources");
const { buildExportFile, buildMarkdown, buildPlainText } = await import(
  "../src/lib/resultExport"
);
const enTypesData = (await import("../src/locales/en/types.json")).default as unknown as {
  code: string;
  personaName: string;
  headline: string;
}[];

/**
 * 결과 내보내기 (Markdown / TXT × 한국어 / English).
 * 저장된 결과를 읽어 파일 문자열만 만드는 read-only 기능이다.
 */
describe("결과 내보내기 — 네 가지 조합", () => {
  const COMBOS: [("ko" | "en"), ("md" | "txt")][] = [
    ["ko", "md"],
    ["ko", "txt"],
    ["en", "md"],
    ["en", "txt"]
  ];

  it("네 조합 모두 파일이 생성되고 확장자·MIME 이 일치한다", () => {
    const stored = buildResult(2);
    for (const [locale, format] of COMBOS) {
      const f = buildExportFile(stored, locale, format);
      expect(f.filename, `${locale}.${format}`).toMatch(
        new RegExp(`^MYCORE12_result_\\d{4}-\\d{2}-\\d{2}_${locale}\\.${format}$`)
      );
      expect(f.mime).toBe(
        format === "md"
          ? "text/markdown;charset=utf-8"
          : "text/plain;charset=utf-8"
      );
      expect(f.content.length).toBeGreaterThan(1000);
      // 내부 type code / bitString 을 파일명이나 본문에 노출하지 않는다
      expect(f.filename).not.toMatch(/[01]-[01]/);
      expect(f.content).not.toMatch(/\d-\d-\d-\d-\d-\d/);
      expect(f.content.includes("bitString")).toBe(false);
    }
  });

  it("txt 는 UTF-8 BOM 으로 시작하고 md 는 붙이지 않는다", () => {
    const stored = buildResult(2);
    expect(buildExportFile(stored, "ko", "txt").content.startsWith("\uFEFF")).toBe(true);
    expect(buildExportFile(stored, "en", "txt").content.startsWith("\uFEFF")).toBe(true);
    expect(buildExportFile(stored, "ko", "md").content.startsWith("\uFEFF")).toBe(false);
  });

  it("Markdown 은 heading 구조를 갖고 TXT 는 Markdown 기호를 쓰지 않는다", () => {
    const stored = buildResult(2);
    const md = buildMarkdown(stored, "ko");
    expect(md.startsWith("# MYCORE12")).toBe(true);
    expect(md).toContain("\n## ");
    expect(md).toContain("\n- ");

    const txt = buildPlainText(stored, "ko");
    expect(/^#\s/m.test(txt), "TXT 에 markdown heading").toBe(false);
    expect(/^\s*\*\s/m.test(txt), "TXT 에 markdown bullet").toBe(false);
  });

  it("선택한 언어의 personaName / headline 이 담긴다", () => {
    const stored = buildResult(2);
    const koType = matchType(stored.code);
    const enType = enTypesData.find(t => t.code === stored.code)!;

    for (const format of ["md", "txt"] as const) {
      const ko = buildExportFile(stored, "ko", format).content;
      expect(ko).toContain(koType.personaName);
      expect(ko).toContain(koType.headline);

      const en = buildExportFile(stored, "en", format).content;
      expect(en).toContain(enType.personaName);
      expect(en).toContain(enType.headline);
    }
  });

  it("12에너지 점수가 화면 결과와 같고 축마다 합이 100 이다", () => {
    const stored = buildResult(4);
    const ko = buildExportFile(stored, "ko", "txt").content;
    const en = buildExportFile(stored, "en", "txt").content;

    for (const axis of AXES) {
      const p1 = stored.energyScores[axis.pole1];
      const p0 = stored.energyScores[axis.pole0];
      expect(Math.round(p1 + p0), axis.axis).toBe(100);
      // 한국어 파일은 한국어 에너지명 + 점수
      expect(ko).toContain(`${axis.pole1}: ${p1}`);
      expect(ko).toContain(`${axis.pole0}: ${p0}`);
      // 영문 파일은 공식 영문 표시명 + 같은 점수
      expect(en).toContain(`${energyLabel(axis.pole1, "en")}: ${p1}`);
      expect(en).toContain(`${energyLabel(axis.pole0, "en")}: ${p0}`);
    }
  });

  it("English 파일에 사용자 표시용 한국어가 남지 않는다", () => {
    const stored = buildResult(3);
    for (const format of ["md", "txt"] as const) {
      const body = buildExportFile(stored, "en", format).content;
      const hangul = body.match(/[가-힣]+/g) ?? [];
      expect(hangul, hangul.join(", ")).toEqual([]);
    }
  });

  it("Korean 파일에 영문 결과 본문이 섞이지 않는다", () => {
    const stored = buildResult(3);
    const enType = enTypesData.find(t => t.code === stored.code)!;
    for (const format of ["md", "txt"] as const) {
      const body = buildExportFile(stored, "ko", format).content;
      expect(body).not.toContain(enType.personaName);
      expect(body).not.toContain(enType.headline);
      // 브랜드 표기는 유지된다
      expect(body).toContain("MYCORE12");
    }
  });

  it("모든 결과 섹션이 파일에 포함된다", () => {
    const stored = buildResult(2);
    const type = matchType(stored.code);
    const body = buildExportFile(stored, "ko", "md").content;

    expect(body).toContain(type.overview);
    expect(body).toContain(type.workStyle);
    expect(body).toContain(type.decisionStyle);
    expect(body).toContain(type.relationshipStyle);
    expect(body).toContain(type.teamContribution);
    expect(body).toContain(type.encouragement);
    for (const s of type.strengths) expect(body).toContain(s);
    for (const s of type.cautions) expect(body).toContain(s);
    for (const s of type.goodFitSituations) expect(body).toContain(s);
    for (const s of type.stressSignals) expect(body).toContain(s);
    for (const s of type.recoveryStrategies) expect(body).toContain(s);
    for (const s of type.selfCoachingQuestions) expect(body).toContain(s);
    for (const s of Object.values(type.developmentRoadmap)) expect(body).toContain(s);
    for (const g of type.developmentGuide) expect(body).toContain(g.practice);
  });

  it("export 는 저장 데이터와 locale 을 바꾸지 않는다 (read-only)", () => {
    const stored = buildResult(2);
    const before = store.get("mycore12.results.v1")!;
    const localeBefore = store.get("mycore12.locale.v1");

    for (const [locale, format] of COMBOS) buildExportFile(stored, locale, format);

    expect(store.get("mycore12.results.v1")).toBe(before);
    expect(store.get("mycore12.locale.v1")).toBe(localeBefore);
    expect(storage.getResults()).toHaveLength(1);
  });

  it("과거 저장 이름이 아니라 code 로 현재 유형을 조회한다", () => {
    buildResult(2);
    const all = JSON.parse(store.get("mycore12.results.v1")!);
    all[all.length - 1].typePersonaName = "STALE-NAME";
    store.set("mycore12.results.v1", JSON.stringify(all));
    const fresh = storage.getResults()[0];

    const body = buildExportFile(fresh, "ko", "md").content;
    expect(body).not.toContain("STALE-NAME");
    expect(body).toContain(matchType(fresh.code).personaName);
  });
});

describe("결과 다운로드 UI", () => {
  it("결과 화면에 다운로드 버튼이 있고 4개 항목이 열린다", () => {
    const stored = buildResult(2);
    const { container } = renderAt(`/result/${stored.sessionId}`);
    const btn = screen.getByRole("button", { name: /결과 다운로드/ });
    expect(btn.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    const items = container.querySelectorAll('.download-menu [role="menuitem"]');
    expect(items).toHaveLength(4);
    expect([...items].map(i => i.textContent)).toEqual([
      "Markdown (.md)",
      "텍스트 (.txt)",
      "Markdown (.md)",
      "텍스트 (.txt)"
    ]);
    // 언어 그룹 라벨
    const groups = [...container.querySelectorAll(".download-group-label")].map(
      g => g.textContent
    );
    expect(groups).toEqual(["한국어", "English"]);
  });

  it("English 화면에서도 같은 4개 조합을 제공한다", () => {
    store.set("mycore12.locale.v1", "en");
    const stored = buildResult(2);
    const { container } = renderAt(`/result/${stored.sessionId}`);
    fireEvent.click(screen.getByRole("button", { name: /Download Result/ }));
    const groups = [...container.querySelectorAll(".download-group-label")].map(
      g => g.textContent
    );
    expect(groups).toEqual(["Korean", "English"]);
    expect(container.querySelectorAll('.download-menu [role="menuitem"]')).toHaveLength(4);
  });

  it("Esc 로 닫히고 메뉴 항목이 키보드로 접근 가능하다", () => {
    const r = buildResult(2);
    const { container } = renderAt(`/result/${r.sessionId}`);
    fireEvent.click(screen.getByRole("button", { name: /결과 다운로드/ }));
    expect(container.querySelector(".download-menu")).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(container.querySelector(".download-menu")).toBeNull();

    // 메뉴 항목은 실제 button 이라 키보드로 활성화된다 (CSS 텍스트가 아니다)
    fireEvent.click(screen.getByRole("button", { name: /결과 다운로드/ }));
    for (const item of container.querySelectorAll('.download-menu [role="menuitem"]')) {
      expect(item.tagName).toBe("BUTTON");
      expect(item.hasAttribute("disabled")).toBe(false);
      expect(item.textContent!.trim().length).toBeGreaterThan(0);
    }
  });
});

/**
 * English 레이아웃 보정 — 영어 단어가 중간에서 끊기지 않고
 * 12에너지 라벨이 SVG 안에 온전히 들어가는지 확인한다.
 */
describe("English 레이아웃 보정", () => {
  const css = readFileSync(join(__dirname, "../src/styles/global.css"), "utf8");

  it("영어 전용 규칙으로만 적용하고 한국어 기본 규칙은 그대로다", () => {
    expect(css).toContain('html[lang="en"]');
    // 한국어 기본 규칙(keep-all)은 유지된다
    expect(css).toMatch(/word-break:\s*keep-all/);
  });

  it("짧은 라벨은 단어 중간에서 끊기지 않는다", () => {
    const block = css.slice(css.indexOf('html[lang="en"] .length-head b'));
    expect(block).toContain("white-space: nowrap");
    expect(block).toContain("word-break: normal");
    expect(block).toContain("hyphens: none");
  });

  it("검사 길이 카드는 영어에서 세로로 쌓인다", () => {
    const m = css.match(/html\[lang="en"\] \.length-head \{[^}]*\}/)!;
    expect(m[0]).toContain("flex-direction: column");
    expect(m[0]).toContain("align-items: flex-start");
  });

  it("영어 hero 는 왼쪽 컬럼에 더 넓은 폭을 준다", () => {
    expect(css).toMatch(
      /html\[lang="en"\] \.hero \.inner \{ grid-template-columns: 1\.1\d+fr/
    );
  });

  it("영문 에너지 이름을 축약하지 않는다", () => {
    const glossary = JSON.parse(
      readFileSync(join(__dirname, "../src/locales/en/glossary.json"), "utf8")
    );
    const names = Object.values(glossary.axes).flatMap((a: any) => [
      a.pole1.en,
      a.pole0.en
    ]);
    expect(names).toEqual([
      "Initiative", "Deliberation",
      "Coordination", "Autonomy",
      "Creativity", "Practicality",
      "Analysis", "Integration",
      "Empathy", "Clarity",
      "Structure", "Flexibility"
    ]);
    for (const n of names) expect(n.endsWith("."), n).toBe(false);
  });
});

describe("12에너지 라벨 안전 영역", () => {
  it("영어에서 차트 본체를 줄이고 viewBox 를 넓힌다", async () => {
    const mod = await import("../src/components/energyRingLabels");
    expect(mod.chartScale("ko")).toBe(1);
    expect(mod.chartScale("en")).toBeGreaterThanOrEqual(0.78);
    expect(mod.chartScale("en")).toBeLessThanOrEqual(0.84);
    expect(mod.viewBoxPad("ko")).toBe(0);
    expect(mod.viewBoxPad("en")).toBeGreaterThan(0);
    // node 는 너무 작아지지 않는다
    expect(mod.nodeScale("en")).toBeGreaterThanOrEqual(0.9);
  });

  it("위치별 anchor 가 바깥 방향으로 설정된다", async () => {
    const { labelPlacement } = await import("../src/components/energyRingLabels");
    const ring = ["추진","조율","창의","분석","공감","원칙","숙고","자율","구체","통합","명료","유연"];
    const anchors = ring.map((e, i) => labelPlacement(i, e, "en").anchor);
    expect(anchors).toEqual([
      "middle",                                   // Initiative (12시)
      "start", "start", "start", "start", "start", // 오른쪽 절반
      "middle",                                   // Deliberation (6시)
      "end", "end", "end", "end", "end"            // 왼쪽 절반
    ]);
    // 한국어는 기존대로 전부 가운데 정렬
    expect(ring.map((e, i) => labelPlacement(i, e, "ko").anchor)).toEqual(
      Array(12).fill("middle")
    );
  });

  it("영어 라벨 12개가 SVG 경계 안에 들어간다 (Orbit · EnergyMap)", async () => {
    const { chartScale, labelPlacement, viewBoxPad } = await import(
      "../src/components/energyRingLabels"
    );
    const ring = ["추진","조율","창의","분석","공감","원칙","숙고","자율","구체","통합","명료","유연"];
    const en = ["Initiative","Coordination","Creativity","Analysis","Empathy","Structure",
                "Deliberation","Autonomy","Practicality","Integration","Clarity","Flexibility"];

    const check = (size: number, baseR: number, fontSize: number) => {
      const c = size / 2;
      const rOuter = baseR * chartScale("en");
      const pad = viewBoxPad("en");
      const charW = fontSize * 0.6; // 넉넉하게 잡은 평균 자폭
      let worst = Infinity;
      ring.forEach((key, i) => {
        const p = labelPlacement(i, key, "en");
        const angle = (Math.PI * 2 * i) / 12 - Math.PI / 2;
        const lx = c + rOuter * p.radiusRatio * Math.cos(angle) + p.dx;
        const w = en[i].length * charW;
        const x0 = p.anchor === "start" ? lx : p.anchor === "end" ? lx - w : lx - w / 2;
        const x1 = x0 + w;
        worst = Math.min(worst, x0 - -pad, size + pad - x1);
      });
      return worst;
    };

    // 여백이 0 보다 크면 잘리지 않는다
    expect(check(400, 142, 14), "Orbit").toBeGreaterThan(0);
    expect(check(468, 166, 16), "EnergyMap").toBeGreaterThan(0);
  });
});

/**
 * 진행 중인 검사가 있을 때의 시작 화면.
 * 이어서 진행 / 새로 시작 두 갈래를 모두 제공한다.
 */
describe("진행 중 검사와 새로 시작하기", () => {
  const startAssessment = (container: HTMLElement) => {
    fireEvent.click(screen.getByRole("button", { name: "검사 시작" }));
    fireEvent.click(
      container.querySelectorAll(".v-scale .v-opt, .scale-h [role=radio]")[1]
    );
  };

  it("진행 중이면 이어서 진행 / 새로 시작 버튼이 함께 보인다", () => {
    const first = renderAt("/");
    startAssessment(first.container);
    cleanup();

    renderAt("/");
    expect(screen.getByRole("button", { name: "이어서 진행하기" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "새로 시작하기" })).toBeTruthy();
    // 검사 방식 안내 링크도 계속 접근 가능하다
    expect(screen.getByRole("link", { name: /검사 방식 알아보기/ })).toBeTruthy();
  });

  it("진행 중이 아니면 새로 시작 버튼을 보여주지 않는다", () => {
    renderAt("/");
    expect(screen.queryByRole("button", { name: "새로 시작하기" })).toBeNull();
    expect(screen.getByRole("button", { name: "검사 시작" })).toBeTruthy();
  });

  it("확인을 취소하면 기존 세션이 그대로 유지된다", () => {
    const first = renderAt("/");
    startAssessment(first.container);
    const before = storage.getActiveSession()!;
    cleanup();

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "새로 시작하기" }));

    const after = storage.getActiveSession()!;
    expect(after.sessionId).toBe(before.sessionId);
    expect(after.questionIds).toEqual(before.questionIds);
    expect(after.answers).toEqual(before.answers);
    confirmSpy.mockRestore();
  });

  it("확인하면 기존 세션이 사라지고 새 검사가 시작된다", () => {
    const first = renderAt("/");
    startAssessment(first.container);
    const before = storage.getActiveSession()!;
    expect(Object.keys(before.answers)).toHaveLength(1);
    cleanup();

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "새로 시작하기" }));

    const after = storage.getActiveSession()!;
    expect(after.sessionId).not.toBe(before.sessionId);
    expect(after.answers).toEqual({});
    expect(after.assessmentLength).toBe(36);
    confirmSpy.mockRestore();
  });

  it("완료된 결과 기록은 지우지 않는다", () => {
    const stored = buildResult(2);
    const firstHome = renderAt("/");
    startAssessment(firstHome.container);
    cleanup();

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "새로 시작하기" }));

    const results = storage.getResults();
    expect(results).toHaveLength(1);
    expect(results[0].sessionId).toBe(stored.sessionId);
    confirmSpy.mockRestore();
  });

  it("English 화면에서도 두 버튼이 영문으로 나온다", () => {
    store.set("mycore12.locale.v1", "en");
    const first = renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "Start Assessment" }));
    fireEvent.click(
      first.container.querySelectorAll(".v-scale .v-opt, .scale-h [role=radio]")[1]
    );
    cleanup();

    renderAt("/");
    expect(screen.getByRole("button", { name: "Resume Assessment" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start Over" })).toBeTruthy();
  });
});

/**
 * 응답 버튼의 문구와 색.
 * 값(1~5)·side·tone 구조는 그대로 두고 표시만 다룬다.
 */
describe("응답 버튼 문구와 톤 색상", () => {
  /** 이 파일 기본은 넓은 화면이라 모바일 UI 검사에서만 좁은 화면으로 바꾼다 */
  const setNarrow = (narrow: boolean) => {
    Object.defineProperty(globalThis, "matchMedia", {
      configurable: true,
      writable: true,
      value: (q: string) => ({
        matches: q.includes("min-width: 700px") ? !narrow : narrow,
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {}
      })
    });
  };
  beforeEach(() => setNarrow(true));
  afterEach(() => setNarrow(false));

  const A_STRONG = "var(--choice-a)";
  const B_STRONG = "var(--choice-b)";
  const A_SOFT = "color-mix(in srgb, var(--choice-a) 68%, var(--color-text-secondary))";
  const B_SOFT = "color-mix(in srgb, var(--choice-b) 68%, var(--color-text-secondary))";
  const NEUTRAL = "var(--color-text-secondary)";

  it("영어 모바일 문구가 Much more / A little more / About the same 이다", () => {
    store.set("mycore12.locale.v1", "en");
    const { container } = renderAt("/assessment");
    expect(
      [...container.querySelectorAll(".v-opt-label")].map(e => e.textContent)
    ).toEqual([
      "Much more",
      "A little more",
      "About the same",
      "A little more",
      "Much more"
    ]);
  });

  it("한국어 문구는 그대로 유지된다", () => {
    const { container } = renderAt("/assessment");
    expect(
      [...container.querySelectorAll(".v-opt-label")].map(e => e.textContent)
    ).toEqual([
      "매우 그렇다",
      "약간 그렇다",
      "둘 다 비슷하다",
      "약간 그렇다",
      "매우 그렇다"
    ]);
  });

  it("모바일 5개 버튼 글자색이 indicator 톤 순서를 따른다 (ko/en 동일)", () => {
    for (const loc of ["ko", "en"]) {
      store.clear();
      store.set("mycore12.locale.v1", loc);
      const { container, unmount } = renderAt("/assessment");
      const opts = [...container.querySelectorAll(".v-opt")] as HTMLElement[];
      expect(opts, loc).toHaveLength(5);
      expect(opts.map(o => o.style.color), loc).toEqual([
        A_STRONG,
        A_SOFT,
        NEUTRAL,
        B_SOFT,
        B_STRONG
      ]);
      // indicator 자체의 대칭 구조는 그대로다
      const dots = [...container.querySelectorAll(".v-dot")] as HTMLElement[];
      expect(dots.map(d => d.className.replace("v-dot ", "")), loc).toEqual([
        "strong",
        "soft",
        "neutral",
        "soft",
        "strong"
      ]);
      unmount();
    }
  });

  it("데스크톱 척도 문구 색도 같은 톤 순서를 따른다", () => {
    setNarrow(false);
    const { container } = renderAt("/assessment");
    const buttons = [...container.querySelectorAll('.scale-h [role="radio"]')] as HTMLElement[];
    expect(buttons).toHaveLength(5);
    expect(buttons.map(b => b.style.color)).toEqual([
      A_STRONG,
      A_SOFT,
      NEUTRAL,
      B_SOFT,
      B_STRONG
    ]);
  });

  it("응답값 1~5 의미는 문구·색 변경과 무관하게 그대로다", () => {
    for (const loc of ["ko", "en"]) {
      for (let i = 0; i < 5; i++) {
        store.clear();
        store.set("mycore12.locale.v1", loc);
        const { container, unmount } = renderAt("/assessment");
        const id = storage.getActiveSession()!.questionIds[0];
        fireEvent.click(container.querySelectorAll(".v-scale .v-opt")[i]);
        expect(storage.getActiveSession()!.answers[id], `${loc} ${i}`).toBe(i + 1);
        unmount();
      }
    }
  });

  it("선택 상태에서도 글자색이 톤 색을 유지한다 (CSS 가 덮지 않는다)", () => {
    const css = readFileSync(join(__dirname, "../src/styles/global.css"), "utf8");
    const on = css.match(/^\.v-opt\.on \{[^}]*\}/m)![0];
    expect(/(^|[\s;])color:/m.test(on), on).toBe(false);
    const base = css.match(/^\.v-opt \{[^}]*\}/m)![0];
    expect(/(^|[\s;])color:\s*var\(--color-slate\)/m.test(base)).toBe(false);
  });
});
