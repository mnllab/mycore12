/**
 * 브랜드 변경 회귀 고정(golden) 테스트.
 *
 * 고정된 36문항 ID + 고정된 응답을 넣었을 때 나오는 진단 결과를 상수로 잠근다.
 * 브랜드 마이그레이션(CORE12 → 마이코어12 / MYCORE12) 때문에 12에너지 점수,
 * 6축 점수, 64유형 code, personaName, 결과 설명 데이터가 달라지면 즉시 실패한다.
 */
import { describe, expect, it } from "vitest";
import { scoreAssessment } from "../src/vendor/positive_assessment_engine_FINAL_v3.1.js";
import { POSITIVE_QUESTION_BANK } from "../src/vendor/positive_144_situational_question_bank_FINAL_v3.1.js";
import { matchType, QUESTION_BY_ID } from "../src/lib/mycore12";

const BANK = POSITIVE_QUESTION_BANK as any;

/** 결정적 36문항: 축별 6개 상황 × A방향 3:3 (랜덤 사용 안 함) */
const FIXED_IDS = [
  "AS-D01", "AS-W01", "AS-R01", "AS-T02", "AS-C02", "AS-J02",
  "CA-D01", "CA-W01", "CA-R01", "CA-T02", "CA-C02", "CA-J02",
  "IC-D01", "IC-W01", "IC-R01", "IC-T02", "IC-C02", "IC-J02",
  "JI-D01", "JI-W01", "JI-R01", "JI-T02", "JI-C02", "JI-J02",
  "RE-D01", "RE-W01", "RE-R01", "RE-T02", "RE-C02", "RE-J02",
  "OF-D01", "OF-W01", "OF-R01", "OF-T02", "OF-C02", "OF-J02"
];

/** 고정 응답 패턴 1,2,3,4,5 반복 */
const FIXED_ANSWERS: Record<string, number> = Object.fromEntries(
  FIXED_IDS.map((id, i) => [id, [1, 2, 3, 4, 5][i % 5]])
);

/** 브랜드 변경 이전 기준값 */
const GOLDEN = {
  code: "1-0-0-0-1-1",
  personaName: "믿음직한 돌봄 리더",
  energyScores: {
    추진: 66.7, 숙고: 33.3,
    조율: 45.8, 자율: 54.2,
    창의: 25, 구체: 75,
    분석: 45.8, 통합: 54.2,
    공감: 66.7, 명료: 33.3,
    원칙: 66.7, 유연: 33.3
  } as Record<string, number>,
  axisScores: {
    action: [66.7, 33.3],
    collaboration: [45.8, 54.2],
    ideation: [25, 75],
    judgment: [45.8, 54.2],
    relationship: [66.7, 33.3],
    operation: [66.7, 33.3]
  } as Record<string, number[]>,
  strengthsFirst: "결정 가능한 시점을 잡고 첫 행동을 만들어 정체된 상황",
  developmentFirstPractice: "중요한 결정 전 목적, 영향, 되돌릴 수 있는지 세 항"
};

const items = FIXED_IDS.map(id => {
  const q = QUESTION_BY_ID.get(id);
  if (!q) throw new Error(`고정 문항 ${id} 가 문항은행에 없습니다.`);
  return q;
});

describe("브랜드 변경 회귀 고정값", () => {
  it("고정 문항 36개가 문항은행에 그대로 존재한다", () => {
    expect(items).toHaveLength(36);
    expect(new Set(FIXED_IDS).size).toBe(36);
    for (const axis of BANK.axes) {
      const axisItems = items.filter(q => q.axis === axis.axis);
      expect(axisItems).toHaveLength(6);
      expect(new Set(axisItems.map(q => q.context)).size).toBe(6);
      expect(axisItems.filter(q => q.optionAValue === axis.pole1)).toHaveLength(3);
    }
  });

  it("12에너지 점수가 브랜드 변경 전과 동일하다", () => {
    const r = scoreAssessment(items, FIXED_ANSWERS) as any;
    expect(r.energyScores).toEqual(GOLDEN.energyScores);
    const total = Object.values(r.energyScores as Record<string, number>).reduce(
      (a, b) => a + b,
      0
    );
    expect(total).toBeCloseTo(600, 6);
  });

  it("6개 양극축 점수가 브랜드 변경 전과 동일하다", () => {
    const r = scoreAssessment(items, FIXED_ANSWERS) as any;
    for (const [axis, [p1, p0]] of Object.entries(GOLDEN.axisScores)) {
      expect(r.axisResults[axis].pole1Score, axis).toBe(p1);
      expect(r.axisResults[axis].pole0Score, axis).toBe(p0);
      expect(p1 + p0).toBeCloseTo(100, 6);
    }
  });

  it("64유형 code·personaName·결과 설명 데이터가 브랜드 변경 전과 동일하다", () => {
    const r = scoreAssessment(items, FIXED_ANSWERS) as any;
    expect(r.code).toBe(GOLDEN.code);

    const type = matchType(r.code);
    expect(type.personaName).toBe(GOLDEN.personaName);
    expect(type.strengths[0].startsWith(GOLDEN.strengthsFirst)).toBe(true);
    expect(
      type.developmentGuide[0].practice.startsWith(GOLDEN.developmentFirstPractice)
    ).toBe(true);

    // 결과 콘텐츠 필드 구조도 그대로다
    expect(type.strengths).toHaveLength(9);
    expect(type.developmentGuide).toHaveLength(6);
    expect(type.cautions).toHaveLength(7);
    expect(type.stressSignals).toHaveLength(5);
    expect(type.recoveryStrategies).toHaveLength(4);
    expect(type.selfCoachingQuestions).toHaveLength(4);
    expect(Object.keys(type.developmentRoadmap)).toEqual([
      "startNow",
      "next30Days",
      "longTerm"
    ]);
  });

  it("동일 입력은 항상 동일 출력이다 (100회 재실행)", () => {
    const first = JSON.stringify(scoreAssessment(items, FIXED_ANSWERS));
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(scoreAssessment(items, FIXED_ANSWERS))).toBe(first);
    }
  });
});
