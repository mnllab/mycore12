/**
 * 세션·저장 검수 (검수항목 9, 10, 11, 21, 22, 23, 24).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { countAdjacentSameAxis } from "../src/lib/ordering";

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k)
};

const mod = await import("../src/lib/storage");
const K_SESSION = "mycore12.activeSession.v1";

const answerAll = (s: any, value: 1 | 2 | 3 | 4 | 5 = 3) => {
  for (const q of mod.questionsOf(s)) s.answers[q.id] = value;
  return s;
};

describe("9·10. 새로고침 복원", () => {
  beforeEach(() => store.clear());

  it("9. 새로고침(재조회) 후 동일한 36문항이 같은 순서로 유지된다", () => {
    const s1 = mod.startNewSession();
    for (let i = 0; i < 5; i++) {
      const restored = mod.getActiveSession()!;
      expect(restored.sessionId).toBe(s1.sessionId);
      expect(restored.questionIds).toEqual(s1.questionIds);
      expect(mod.questionsOf(restored).map(q => q.id)).toEqual(s1.questionIds);
    }
    // 복원된 세션도 축 연속 없음 조건을 유지한다
    expect(countAdjacentSameAxis(mod.questionsOf(mod.getActiveSession()!))).toBe(0);
  });

  it("10. 기존 답변과 현재 문항 위치가 그대로 복원된다", () => {
    const s = mod.startNewSession();
    const items = mod.questionsOf(s);
    s.answers[items[0].id] = 1;
    s.answers[items[1].id] = 4;
    s.answers[items[2].id] = 5;
    s.currentIndex = 3;
    mod.saveSession(s);

    const restored = mod.getActiveSession()!;
    expect(restored.currentIndex).toBe(3);
    expect(restored.answers[items[0].id]).toBe(1);
    expect(restored.answers[items[1].id]).toBe(4);
    expect(restored.answers[items[2].id]).toBe(5);
    expect(Object.keys(restored.answers).length).toBe(3);
  });

  it("검사를 새로 시작할 때만 새 문항 세트를 뽑는다", () => {
    const s1 = mod.startNewSession();
    expect(mod.getActiveSession()!.questionIds).toEqual(s1.questionIds);
    mod.clearActiveSession();
    const s2 = mod.startNewSession();
    expect(s2.sessionId).not.toBe(s1.sessionId);
  });
});

describe("11. 재검사 최근 문항 회피", () => {
  beforeEach(() => store.clear());

  it("직전 검사 문항과 겹치지 않는다 (100회)", () => {
    const s = answerAll(mod.startNewSession());
    mod.completeSession(s);
    for (let i = 0; i < 100; i++) {
      const next = mod.startNewSession();
      expect(next.questionIds.filter(id => s.questionIds.includes(id)).length).toBe(0);
      mod.clearActiveSession();
    }
  });

  it("최근 이력이 누적돼 후보가 소진돼도 36문항 구조를 유지한다", () => {
    // 슬롯당 후보가 2개이므로 2회 이상 누적되면 엔진 fallback(재출제 허용)이 동작한다
    for (let round = 0; round < 4; round++) {
      const s = answerAll(mod.startNewSession());
      mod.completeSession(s);
    }
    const s = mod.startNewSession();
    expect(s.questionIds.length).toBe(36);
    expect(new Set(s.questionIds).size).toBe(36);
    expect(countAdjacentSameAxis(mod.questionsOf(s))).toBe(0);
    expect(mod.getRecentQuestionIds().length).toBe(36 * 3); // 최근 3회만 보관
  });
});

describe("21·22·23. 결과 저장·조회·삭제", () => {
  beforeEach(() => store.clear());

  it("21. 완료 결과가 버전 정보와 함께 저장된다", () => {
    const s = answerAll(mod.startNewSession(), 1);
    const r = mod.completeSession(s);
    expect(r.code.split("-").length).toBe(6);
    expect(r.typePersonaName.length).toBeGreaterThan(0);
    expect(Object.keys(r.energyScores).length).toBe(12);
    expect(Object.values(r.energyScores).reduce((a, b) => a + b, 0)).toBeCloseTo(600, 6);
    expect(r.bankVersion).toBe("3.1-operational-final");
    expect(r.engineVersion).toBe("FINAL_v3.1");
    expect(r.typeDatasetVersion).toBe("2.1");
    expect(r.questionIds.length).toBe(36);
    expect(mod.getActiveSession()).toBeNull(); // 완료 후 세션 종료
  });

  it("22. 저장된 결과를 다시 열 수 있다 (여러 건 누적 포함)", () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const s = answerAll(mod.startNewSession(), (i + 1) as 1 | 2 | 3);
      ids.push(mod.completeSession(s).sessionId);
    }
    expect(mod.getResults().length).toBe(3);
    for (const id of ids) expect(mod.getResult(id)?.sessionId).toBe(id);
    expect(mod.getLatestResult()?.sessionId).toBe(ids[2]);
  });

  it("23. 개별 삭제와 전체 삭제가 동작한다", () => {
    const a = mod.completeSession(answerAll(mod.startNewSession()));
    const b = mod.completeSession(answerAll(mod.startNewSession()));
    mod.deleteResult(a.sessionId);
    expect(mod.getResult(a.sessionId)).toBeNull();
    expect(mod.getResult(b.sessionId)).not.toBeNull();

    mod.startNewSession();
    mod.deleteAllLocalData();
    expect(mod.getActiveSession()).toBeNull();
    expect(mod.getResults().length).toBe(0);
    expect(mod.getRecentQuestionIds().length).toBe(0);
  });
});

describe("24. 손상 데이터 처리", () => {
  beforeEach(() => store.clear());

  it("존재하지 않는 문항 ID가 섞인 세션은 복원하지 않는다 (크래시 대신 새 검사)", () => {
    const s = mod.startNewSession();
    s.questionIds[5] = "NOT-A-REAL-ID";
    store.set(K_SESSION, JSON.stringify(s));
    expect(mod.getActiveSession()).toBeNull();
  });

  it("문항 수·중복·응답값·인덱스가 잘못된 세션을 방어한다", () => {
    const base = mod.startNewSession();

    const short = { ...base, questionIds: base.questionIds.slice(0, 20) };
    store.set(K_SESSION, JSON.stringify(short));
    expect(mod.getActiveSession()).toBeNull();

    const dup = { ...base, questionIds: [...base.questionIds.slice(0, 35), base.questionIds[0]] };
    store.set(K_SESSION, JSON.stringify(dup));
    expect(mod.getActiveSession()).toBeNull();

    const badAnswer = { ...base, answers: { [base.questionIds[0]]: 7 } };
    store.set(K_SESSION, JSON.stringify(badAnswer));
    expect(mod.getActiveSession()).toBeNull();

    const badIndex = { ...base, currentIndex: 99 };
    store.set(K_SESSION, JSON.stringify(badIndex));
    expect(mod.getActiveSession()?.currentIndex).toBe(0); // 인덱스만 복구

    const oldBank = { ...base, bankVersion: "0.9-legacy" };
    store.set(K_SESSION, JSON.stringify(oldBank));
    expect(mod.getActiveSession()).toBeNull();
  });

  it("깨진 JSON이 저장돼 있어도 예외 없이 null을 반환한다", () => {
    store.set(K_SESSION, "{not-json");
    expect(mod.getActiveSession()).toBeNull();
    expect(mod.getResults()).toEqual([]);
  });

  it("결과가 없을 때 조회 API가 안전하게 동작한다", () => {
    expect(mod.getResult("없는-세션")).toBeNull();
    expect(mod.getLatestResult()).toBeNull();
    expect(mod.getResults()).toEqual([]);
    expect(() => mod.deleteResult("없는-세션")).not.toThrow();
  });
});
