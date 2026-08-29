/**
 * 검사 길이 선택(18 / 36 / 54 / 72) 회귀 테스트.
 *
 * 검증 대상
 *  - 층화 추출: 축 균형 → 상황 균형 → A/B 방향 균형 (스펙 22~24)
 *  - 채점 정규화: 길이와 무관하게 axis pair 합 100, 12 에너지 합 600 (스펙 25)
 *  - 36문항은 기존 표준 검사와 동일한 구조를 유지 (스펙 38, regression baseline)
 */
import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_LENGTHS,
  DEFAULT_ASSESSMENT_LENGTH,
  drawAssessmentByLength,
  isAssessmentLength,
  LENGTH_OPTIONS
} from "../src/lib/draw";
import { scoreAssessment } from "../src/vendor/positive_assessment_engine_FINAL_v3.1.js";
import { AXES, type Question, type ScoreResult } from "../src/lib/mycore12";

const RUNS = 1000;

describe("검사 길이 옵션", () => {
  it("18/36/54/72 네 가지이고 기본값은 36이다", () => {
    expect(ASSESSMENT_LENGTHS).toEqual([18, 36, 54, 72]);
    expect(DEFAULT_ASSESSMENT_LENGTH).toBe(36);
    expect(LENGTH_OPTIONS.map(o => o.length)).toEqual([18, 36, 54, 72]);
    expect(LENGTH_OPTIONS.filter(o => o.recommended)).toHaveLength(1);
    expect(LENGTH_OPTIONS.find(o => o.recommended)?.length).toBe(36);
  });

  it("지원하지 않는 길이는 거부한다", () => {
    expect(isAssessmentLength(36)).toBe(true);
    expect(isAssessmentLength(24)).toBe(false);
    expect(() =>
      drawAssessmentByLength({ length: 24 as unknown as 36 })
    ).toThrow();
  });

  it("어떤 길이도 우열로 설명하지 않는다", () => {
    const text = LENGTH_OPTIONS.map(o => `${o.tagline} ${o.description}`).join(" ");
    for (const w of ["부정확", "가장 정확", "정확도가 높", "더 신뢰", "미흡", "부족"]) {
      expect(text.includes(w), w).toBe(false);
    }
  });
});

describe.each(ASSESSMENT_LENGTHS)("%i문항 층화 추출 (1000회)", length => {
  const perAxis = length / 6;

  it(`문항 수·축 균형·상황 균형·A/B 균형을 항상 만족한다`, () => {
    let sessionPole1 = 0;
    let sessionPole0 = 0;

    for (let run = 0; run < RUNS; run++) {
      const items = drawAssessmentByLength({ length }) as Question[];

      expect(items).toHaveLength(length);
      expect(new Set(items.map(i => i.id)).size).toBe(length);

      for (const axis of AXES) {
        const ax = items.filter(i => i.axis === axis.axis);
        expect(ax, `${axis.axis} 문항 수`).toHaveLength(perAxis);

        // 상황 균형: 축 안에서 상황별 문항 수가 지정 분포와 일치
        const byContext: Record<string, number> = {};
        for (const i of ax) byContext[i.context] = (byContext[i.context] ?? 0) + 1;
        const counts = Object.values(byContext).sort();
        if (length === 18) expect(counts).toEqual([1, 1, 1]);
        if (length === 36) expect(counts).toEqual([1, 1, 1, 1, 1, 1]);
        if (length === 54) expect(counts).toEqual([1, 1, 1, 2, 2, 2]);
        if (length === 72) expect(counts).toEqual([2, 2, 2, 2, 2, 2]);

        // A/B 방향: 짝수면 정확히 반반, 홀수면 1 차이까지만
        const a1 = ax.filter(i => i.optionAValue === axis.pole1).length;
        const a0 = perAxis - a1;
        expect(Math.abs(a1 - a0)).toBeLessThanOrEqual(perAxis % 2 === 0 ? 0 : 1);
        sessionPole1 += a1;
        sessionPole0 += a0;
      }

      // 세션 전체에서 특정 상황이 몰리지 않는다
      const ctx: Record<string, number> = {};
      for (const i of items) ctx[i.context] = (ctx[i.context] ?? 0) + 1;
      expect(new Set(Object.values(ctx)).size).toBe(1);
    }

    // 홀수 길이도 세션 전체 기준으로는 방향이 정확히 반반이 된다 (9:9 / 27:27)
    expect(sessionPole1).toBe(sessionPole0);
  });
});

describe("채점 정규화 (스펙 25)", () => {
  const answerPatterns: Record<string, (i: number) => 1 | 2 | 3 | 4 | 5> = {
    "모두 중립": () => 3,
    "모두 한쪽 끝": () => 1,
    "번갈아": i => ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5
  };

  for (const [name, fn] of Object.entries(answerPatterns)) {
    it(`${name}: 길이가 달라도 축 합 100, 12에너지 합 600`, () => {
      for (const length of ASSESSMENT_LENGTHS) {
        const items = drawAssessmentByLength({ length }) as Question[];
        const answers: Record<string, number> = {};
        items.forEach((q, i) => (answers[q.id] = fn(i)));

        const result = scoreAssessment(items, answers) as ScoreResult;

        const total = Object.values(result.energyScores).reduce((a, b) => a + b, 0);
        expect(Math.round(total), `${length}문항 12에너지 합`).toBe(600);

        for (const axis of AXES) {
          const sum =
            result.energyScores[axis.pole1] + result.energyScores[axis.pole0];
          expect(Math.round(sum), `${length}문항 ${axis.axis} 축 합`).toBe(100);
        }
        expect(result.bitString).toMatch(/^[01]{6}$/);
      }
    });
  }

  it("모두 중립이면 길이와 무관하게 전 축 50:50이고 동일한 code 가 나온다", () => {
    const codes = new Set<string>();
    for (const length of ASSESSMENT_LENGTHS) {
      const items = drawAssessmentByLength({ length }) as Question[];
      const answers: Record<string, number> = {};
      for (const q of items) answers[q.id] = 3;
      const result = scoreAssessment(items, answers) as ScoreResult;
      for (const v of Object.values(result.energyScores)) expect(v).toBe(50);
      codes.add(result.code);
    }
    // 50:50 동점 처리는 기존 엔진 규칙(pole1Score >= 50 → pole1)을 그대로 따른다
    expect(codes.size).toBe(1);
    expect([...codes][0]).toBe("1-1-1-1-1-1");
  });
});

describe("최근 문항 회피 (스펙 31)", () => {
  it("구조 조건을 깨지 않으면서 최근 문항을 줄인다", () => {
    for (const length of ASSESSMENT_LENGTHS) {
      const first = drawAssessmentByLength({ length }) as Question[];
      const second = drawAssessmentByLength({
        length,
        recentlySeenIds: first.map(q => q.id)
      }) as Question[];

      // 구조는 그대로 유지된다
      expect(second).toHaveLength(length);
      for (const axis of AXES) {
        expect(second.filter(i => i.axis === axis.axis)).toHaveLength(length / 6);
      }
      // 각 (축·상황·방향) 후보가 2개뿐이라 완전 회피는 불가능하지만 절반 이상은 새 문항이다
      const repeat = second.filter(q => first.some(f => f.id === q.id)).length;
      expect(repeat).toBeLessThan(length / 2);
    }
  });
});
