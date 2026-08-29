/**
 * v3.2 문항은행 정식 교체 검증.
 * 데이터 로드 · 추출 5,000회 · 채점 · 기존 결과 호환성 · 문구 변경 전후 회귀.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  drawAssessment,
  scoreAssessment
} from "../src/vendor/positive_assessment_engine_FINAL_v3.1.js";
import {
  AXES,
  BANK_VERSION,
  ORIGINAL_QUESTION_BY_ID,
  QUESTION_BANK,
  QUESTION_BANK_VERSION,
  QUESTION_BY_ID,
  matchType
} from "../src/lib/mycore12";
import { spreadByAxis, countAdjacentSameAxis } from "../src/lib/ordering";

const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k)
  }
});
const storage = await import("../src/lib/storage");

const CONTEXTS = QUESTION_BANK.contexts.map(c => c.context);
const draw = (opts?: { recentlySeenIds?: string[] }) =>
  spreadByAxis(drawAssessment(opts as any) as any[]);

/* ── 1. 데이터 교체 확인 ── */
describe("v3.2 데이터 로드", () => {
  it("운영 문항은행이 v3.2 이고 144문항이 로드된다", () => {
    expect(BANK_VERSION).toBe("3.2.1-blind-review");
    expect(QUESTION_BANK_VERSION).toBe("3.2");
    expect(QUESTION_BANK.questions).toHaveLength(144);
    expect(QUESTION_BANK.questions.filter(q => q.active)).toHaveLength(144);
    expect(QUESTION_BY_ID.size).toBe(144);
  });

  it("중복 ID 없음 · 누락 ID 없음 · v3.1 과 동일한 ID 집합", () => {
    const ids = QUESTION_BANK.questions.map(q => q.id);
    expect(new Set(ids).size).toBe(144);
    for (const id of ids) expect(ORIGINAL_QUESTION_BY_ID.has(id), id).toBe(true);
    expect(ORIGINAL_QUESTION_BY_ID.size).toBe(144);
  });

  it("축별 24문항 · axis×context 4문항 · A방향 12:12", () => {
    for (const axis of AXES) {
      const items = QUESTION_BANK.questions.filter(q => q.axis === axis.axis && q.active);
      expect(items, axis.axis).toHaveLength(24);
      for (const ctx of CONTEXTS) {
        expect(items.filter(q => q.context === ctx), `${axis.axis}/${ctx}`).toHaveLength(4);
      }
      expect(items.filter(q => q.optionAValue === axis.pole1), axis.axis).toHaveLength(12);
      expect(items.filter(q => q.optionAValue === axis.pole0), axis.axis).toHaveLength(12);
    }
  });

  it("엔진이 참조하는 v3.1 모듈과 채점 필드가 완전히 동일하다", () => {
    for (const q of QUESTION_BANK.questions) {
      const o = ORIGINAL_QUESTION_BY_ID.get(q.id)!;
      expect(q.axis, q.id).toBe(o.axis);
      expect(q.context, q.id).toBe(o.context);
      expect(q.optionAValue, q.id).toBe(o.optionAValue);
      expect(q.optionBValue, q.id).toBe(o.optionBValue);
      expect(q.active, q.id).toBe(o.active);
    }
  });
});

/* ── 2. 추출 5,000회 ── */
describe("drawAssessment — 5,000회", () => {
  it("36문항 / 축별 6 / 축별 6개 context 각 1회 / A방향 3:3 / 같은 축 연속 없음", () => {
    let maxAdjacent = 0;
    const seenIds = new Set<string>();

    for (let i = 0; i < 5000; i++) {
      const items = draw();
      expect(items).toHaveLength(36);
      expect(new Set(items.map(q => q.id)).size).toBe(36);

      for (const axis of AXES) {
        const axisItems = items.filter(q => q.axis === axis.axis);
        expect(axisItems).toHaveLength(6);
        expect([...axisItems.map(q => q.context)].sort()).toEqual([...CONTEXTS].sort());
        expect(axisItems.filter(q => q.optionAValue === axis.pole1)).toHaveLength(3);
        expect(axisItems.filter(q => q.optionAValue === axis.pole0)).toHaveLength(3);
      }
      maxAdjacent = Math.max(maxAdjacent, countAdjacentSameAxis(items));
      for (const q of items) seenIds.add(q.id);
    }

    expect(maxAdjacent).toBe(0);
    // 5,000회면 144문항 전부 최소 한 번은 출제된다
    expect(seenIds.size).toBe(144);
  });

  it("recentlySeenIds 가 직전 세트를 회피한다 (300회)", () => {
    const prev = draw().map(q => q.id);
    for (let i = 0; i < 300; i++) {
      const next = draw({ recentlySeenIds: prev });
      expect(next.filter(q => prev.includes(q.id))).toHaveLength(0);
    }
  });
});

/* ── 3. 채점 ── */
describe("scoreAssessment", () => {
  it("무작위 1,000회: 축 합 100 · 12에너지 합 600 · 64유형 매칭", () => {
    for (let i = 0; i < 1000; i++) {
      const items = draw();
      const answers: Record<string, number> = {};
      for (const q of items) answers[q.id] = 1 + Math.floor(Math.random() * 5);
      const r = scoreAssessment(items, answers) as any;

      for (const axis of AXES) {
        const ar = r.axisResults[axis.axis];
        expect(ar.pole1Score + ar.pole0Score).toBeCloseTo(100, 6);
      }
      const scores = Object.values(r.energyScores as Record<string, number>);
      expect(scores).toHaveLength(12);
      expect(scores.reduce((a, b) => a + b, 0)).toBeCloseTo(600, 6);
      expect(() => matchType(r.code)).not.toThrow();
    }
  });

  it("전 문항 3 응답이면 모든 축이 50:50", () => {
    const items = draw();
    const answers: Record<string, number> = {};
    for (const q of items) answers[q.id] = 3;
    const r = scoreAssessment(items, answers) as any;
    for (const axis of AXES) expect(r.axisResults[axis.axis].pole1Score).toBe(50);
  });
});

/* ── 4. 문구 변경 전후 회귀 ── */
describe("문구 변경 전후 결과 동일성", () => {
  it("동일 응답에서 v3.1 문항과 v3.2 문항의 결과가 완전히 같다 (500세트)", () => {
    for (let i = 0; i < 500; i++) {
      const items32 = draw();
      const items31 = items32.map(q => ORIGINAL_QUESTION_BY_ID.get(q.id)!);
      const answers: Record<string, number> = {};
      for (const q of items32) answers[q.id] = 1 + Math.floor(Math.random() * 5);

      const a = scoreAssessment(items31, answers) as any;
      const b = scoreAssessment(items32, answers) as any;

      expect(b.code).toBe(a.code);
      expect(b.bitString).toBe(a.bitString);
      expect(b.energyScores).toEqual(a.energyScores);
      expect(b.preferredEnergies).toEqual(a.preferredEnergies);
      for (const axis of AXES) {
        expect(b.axisResults[axis.axis].pole1Score, axis.axis).toBe(
          a.axisResults[axis.axis].pole1Score
        );
        expect(b.axisResults[axis.axis].pole0Score, axis.axis).toBe(
          a.axisResults[axis.axis].pole0Score
        );
      }
      expect(matchType(b.code).personaName).toBe(matchType(a.code).personaName);
      expect(matchType(b.code).typeName).toBe(matchType(a.code).typeName);
    }
  });
});

/* ── UI 안정성 (문장 길이 기반) ── */
describe("문항 UI 안정성", () => {
  const PADDING: Record<number, number> = {
    320: 20, 375: 20, 390: 20, 430: 20, 768: 40, 1024: 40, 1440: 56
  };
  const lines = (text: string, boxPx: number, fontPx = 16.5) =>
    Math.ceil(text.length / Math.max(Math.floor(boxPx / (fontPx * 0.98)), 1));

  it("모든 뷰포트에서 선택지가 2줄을 넘지 않는다", () => {
    for (const [wStr, pad] of Object.entries(PADDING)) {
      const w = Number(wStr);
      const content = Math.min(w - 2 * pad, 780);
      const wide = w >= 700;
      const box = wide ? (content - 16) / 2 - 44 : content - 32;
      for (const q of QUESTION_BANK.questions) {
        expect(lines(q.optionA, box), `${w}px ${q.id} A`).toBeLessThanOrEqual(2);
        expect(lines(q.optionB, box), `${w}px ${q.id} B`).toBeLessThanOrEqual(2);
      }
    }
  });

  it("두 선택지 줄 수 차이가 1줄을 넘지 않는다 (카드 높이 쏠림 방지)", () => {
    for (const [wStr, pad] of Object.entries(PADDING)) {
      const w = Number(wStr);
      const content = Math.min(w - 2 * pad, 780);
      const wide = w >= 700;
      const box = wide ? (content - 16) / 2 - 44 : content - 32;
      for (const q of QUESTION_BANK.questions) {
        const diff = Math.abs(lines(q.optionA, box) - lines(q.optionB, box));
        expect(diff, `${w}px ${q.id}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("문장 길이 상한을 지켜 카드 높이가 급증하지 않는다", () => {
    for (const q of QUESTION_BANK.questions) {
      expect(q.scenario.length, `${q.id} 상황`).toBeLessThanOrEqual(35);
      expect(q.optionA.length, `${q.id} A`).toBeLessThanOrEqual(40);
      expect(q.optionB.length, `${q.id} B`).toBeLessThanOrEqual(40);
      expect(Math.abs(q.optionA.length - q.optionB.length), `${q.id} 길이차`).toBeLessThanOrEqual(8);
    }
  });

  it("v3.1 대비 줄 수가 늘어난 문항이 없다 (320px 기준)", () => {
    const box = 320 - 40 - 32;
    for (const q of QUESTION_BANK.questions) {
      const o = ORIGINAL_QUESTION_BY_ID.get(q.id)!;
      const now = Math.max(lines(q.optionA, box), lines(q.optionB, box));
      const before = Math.max(lines(o.optionA, box), lines(o.optionB, box));
      expect(now, q.id).toBeLessThanOrEqual(before);
    }
  });
});

/* ── 5. 세션 · 기존 결과 호환성 ── */
describe("세션과 기존 결과 호환성", () => {
  beforeEach(() => store.clear());

  it("새로고침 후 동일 36문항과 이전 응답이 복원된다", () => {
    storage.resetStaleLocalData();
    const s = storage.startNewSession();
    const ids = [...s.questionIds];
    const items = storage.questionsOf(s);
    s.answers[items[0].id] = 1;
    s.answers[items[1].id] = 5;
    s.currentIndex = 2;
    storage.saveSession(s);

    const restored = storage.getActiveSession()!;
    expect(restored.questionIds).toEqual(ids);
    expect(restored.currentIndex).toBe(2);
    expect(restored.answers[items[0].id]).toBe(1);
    expect(restored.answers[items[1].id]).toBe(5);
    expect(storage.questionsOf(restored).map(q => q.id)).toEqual(ids);
  });

  it("새 결과에 questionBankVersion 3.2 가 저장된다", () => {
    storage.resetStaleLocalData();
    const s = storage.startNewSession();
    for (const q of storage.questionsOf(s)) s.answers[q.id] = 4;
    const r = storage.completeSession(s);
    expect(r.questionBankVersion).toBe("3.2");
    expect(r.bankVersion).toBe("3.2.1-blind-review");
    expect(r.engineVersion).toBe("FINAL_v3.1");
    expect(r.typeDatasetVersion).toBe("3.0");
  });

  it("v3.1 시절 결과가 그대로 열리고 버전 표기가 덮어써지지 않는다", () => {
    const legacyResult = {
      sessionId: "legacy-result-1",
      completedAt: "2026-02-03T04:05:06.000Z",
      questionIds: ["AS-D01", "CA-W01"],
      answers: { "AS-D01": 2, "CA-W01": 4 },
      code: "1-0-1-0-1-0",
      preferredEnergies: ["추진", "자율", "창의", "통합", "공감", "유연"],
      energyScores: { 추진: 68, 숙고: 32 },
      axisResults: {},
      typePersonaName: "예전 결과",
      bankVersion: "3.1-operational-final",
      engineVersion: "FINAL_v3.1",
      typeDatasetVersion: "2.1"
    };
    store.set("mycore12.results.v1", JSON.stringify([legacyResult]));
    store.set("mycore12.dataVersion", "3.1-operational-final|FINAL_v3.1|2.1");

    // 버전이 올라가도 완료 결과는 지워지지 않는다
    const report = storage.resetStaleLocalData();
    expect(report.reset).toBe(true);

    const loaded = storage.getResult("legacy-result-1")!;
    expect(loaded).toBeTruthy();
    expect(loaded.bankVersion).toBe("3.1-operational-final"); // 덮어쓰지 않음
    expect(loaded.questionBankVersion).toBeUndefined();
    expect(loaded.code).toBe("1-0-1-0-1-0");
    expect(loaded.answers["AS-D01"]).toBe(2);
    expect(loaded.typePersonaName).toBe("예전 결과");
    // 해당 문항 ID 는 v3.2 에도 그대로 존재한다
    for (const id of loaded.questionIds) expect(QUESTION_BY_ID.has(id), id).toBe(true);
  });

  it("버전이 올라가면 진행 중 세션과 최근 문항 이력만 정리된다", () => {
    storage.resetStaleLocalData();
    const s = storage.startNewSession();
    for (const q of storage.questionsOf(s)) s.answers[q.id] = 3;
    storage.completeSession(s);
    storage.startNewSession(); // 진행 중 세션 생성
    expect(storage.getResults()).toHaveLength(1);

    store.set("mycore12.dataVersion", "3.1-operational-final|FINAL_v3.1|2.1");
    storage.resetStaleLocalData();

    expect(storage.getResults()).toHaveLength(1); // 결과 보존
    expect(storage.getActiveSession()).toBeNull(); // 세션 정리
    expect(storage.getRecentQuestionIds()).toEqual([]); // 이력 정리
  });
});
