/**
 * 문항은행 v3.2 (가독성 윤문) 검수.
 *
 * v3.2 는 v3.1 의 표시 문구만 다듬은 정식 버전이다.
 * 문항 구성과 채점 정보가 v3.1 과 완전히 같아야 하며,
 * 그 결과 진단 결과도 달라지지 않아야 한다.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scoreAssessment } from "../src/vendor/positive_assessment_engine_FINAL_v3.1.js";
import {
  BANK_VERSION,
  ORIGINAL_QUESTION_BY_ID,
  QUESTION_BANK,
  QUESTION_BANK_ORIGINAL,
  QUESTION_BY_ID
} from "../src/lib/mycore12";

const ROOT = join(__dirname, "..");
const changelog = JSON.parse(
  readFileSync(join(ROOT, "src/data/positive_question_bank_changelog_v3.2.json"), "utf8")
);
const REVISED_IDS: string[] = changelog.entries.map((e: any) => e.id);

const AXIS_WORDS = [
  "추진", "숙고", "조율", "자율", "창의", "구체",
  "분석", "통합", "공감", "명료", "원칙", "유연"
];
const HEAVY_VERBS = [
  "조정한다", "파악한다", "적용한다", "유지하며", "정리한다", "확인한다",
  "고려한다", "판단한다", "진행한다", "선택한다", "설정한다", "구성한다",
  "검토한다", "실행한다", "접근한다", "활용한다", "반영한다"
];
const STIFF_NOUNS = [
  "상황", "조건", "기준", "방식", "범위", "전체", "과정",
  "요소", "관리", "운영", "구성", "전반", "맥락", "구체적", "효율"
];
const ABSTRACT = [
  "전체 맥락", "리듬", "주변 조건", "구조적", "통합적", "체계적",
  "가능성을 탐색", "구체화", "요소 간", "영향을 파악", "판단 기준",
  "전반적", "효율", "실행 가능한 대안"
];
const CASUAL = ["그냥 해", "대충", "확 질러", "느낌대로", "고고", "귀찮", "꽂히면"];

describe("v3.2 버전 승격", () => {
  it("운영 문항은행이 v3.2 이고 이전 버전을 명시한다", () => {
    expect(BANK_VERSION).toBe("3.2.1-blind-review");
    expect(QUESTION_BANK.previousVersion).toBe("3.2-readability");
    expect(QUESTION_BANK.questions).toHaveLength(144);
  });

  it("v3.1 원본 파일은 그대로 보존된다", () => {
    expect(QUESTION_BANK_ORIGINAL.version).toBe("3.1-operational-final");
    expect(QUESTION_BANK_ORIGINAL.questions).toHaveLength(144);
    expect(ORIGINAL_QUESTION_BY_ID.get("JI-D02")!.optionA).toBe(
      "생활 전체의 리듬과 주변 조건이 어떻게 연결되는지 살펴본다."
    );
  });

  it("144문항 전수가 윤문되었고 changelog와 일치한다", () => {
    // 상황문장이 이미 충분히 쉬운 문항은 선택지만 다듬었으므로
    // 세 필드 중 하나 이상이 바뀌었는지로 판정한다
    const changed = QUESTION_BANK.questions.filter(q => {
      const o = ORIGINAL_QUESTION_BY_ID.get(q.id)!;
      return (
        q.scenario !== o.scenario || q.optionA !== o.optionA || q.optionB !== o.optionB
      );
    });
    expect(changed).toHaveLength(144);
    expect(REVISED_IDS).toHaveLength(144);
    expect(changed.map(q => q.id).sort()).toEqual([...REVISED_IDS].sort());
  });

  it("changelog 항목이 원문·수정문을 모두 담고 있다", () => {
    for (const e of changelog.entries) {
      const before = ORIGINAL_QUESTION_BY_ID.get(e.id)!;
      const after = QUESTION_BY_ID.get(e.id)!;
      expect(e.originalScenario, e.id).toBe(before.scenario);
      expect(e.originalOptionA, e.id).toBe(before.optionA);
      expect(e.originalOptionB, e.id).toBe(before.optionB);
      expect(e.revisedScenario, e.id).toBe(after.scenario);
      expect(e.revisedOptionA, e.id).toBe(after.optionA);
      expect(e.revisedOptionB, e.id).toBe(after.optionB);
      expect(e.revisionType, e.id).toBeTruthy();
      expect(e.revisionReason, e.id).toBeTruthy();
    }
    expect(changelog.replacedCount).toBe(0);
  });
});

describe("문항은행 구조", () => {
  it("총 144문항 · 중복/누락 ID 0", () => {
    const ids = QUESTION_BANK.questions.map(q => q.id);
    expect(ids).toHaveLength(144);
    expect(new Set(ids).size).toBe(144);
    expect(ids).toEqual(QUESTION_BANK_ORIGINAL.questions.map(q => q.id));
  });

  it("축별 24문항 · axis×context 4문항 · A방향 12:12", () => {
    for (const axis of QUESTION_BANK.axes) {
      const items = QUESTION_BANK.questions.filter(q => q.axis === axis.axis && q.active);
      expect(items, axis.axis).toHaveLength(24);
      for (const c of QUESTION_BANK.contexts) {
        expect(
          items.filter(q => q.context === c.context),
          `${axis.axis}/${c.context}`
        ).toHaveLength(4);
      }
      expect(items.filter(q => q.optionAValue === axis.pole1), axis.axis).toHaveLength(12);
      expect(items.filter(q => q.optionAValue === axis.pole0), axis.axis).toHaveLength(12);
    }
  });

  it("의미가 지나치게 겹치는 문항이 없다", () => {
    const grams = (t: string) => {
      const c = t.replace(/[^가-힣]/g, "");
      return new Set(Array.from({ length: Math.max(c.length - 1, 0) }, (_, i) => c.slice(i, i + 2)));
    };
    const items = QUESTION_BANK.questions.map(q => ({
      id: q.id,
      g: grams(`${q.scenario}${q.optionA}${q.optionB}`)
    }));
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const inter = [...items[i].g].filter(x => items[j].g.has(x)).length;
        const union = new Set([...items[i].g, ...items[j].g]).size;
        expect(inter / union, `${items[i].id} ~ ${items[j].id}`).toBeLessThan(0.5);
      }
    }
  });
});

describe("v3.1 대비 구조 동일성", () => {
  it("문항 순서와 ID가 v3.1 과 완전히 같다", () => {
    expect(QUESTION_BANK.questions.map(q => q.id)).toEqual(
      QUESTION_BANK_ORIGINAL.questions.map(q => q.id)
    );
  });

  it("채점·추출에 쓰이는 필드가 144문항 전부 v3.1 과 동일하다", () => {
    for (const q of QUESTION_BANK.questions) {
      const o = ORIGINAL_QUESTION_BY_ID.get(q.id)!;
      expect(q.axis, q.id).toBe(o.axis);
      expect(q.context, q.id).toBe(o.context);
      expect(q.optionAValue, q.id).toBe(o.optionAValue);
      expect(q.optionBValue, q.id).toBe(o.optionBValue);
      expect(q.pole1, q.id).toBe(o.pole1);
      expect(q.pole0, q.id).toBe(o.pole0);
      expect(q.active, q.id).toBe(o.active);
      expect(q.responseScale, q.id).toEqual(o.responseScale);
    }
  });

  it("채점 결과가 v3.1 과 완전히 동일하다 (144문항 × 응답 1~5)", () => {
    for (const q of QUESTION_BANK.questions) {
      const o = ORIGINAL_QUESTION_BY_ID.get(q.id)!;
      for (const response of [1, 2, 3, 4, 5]) {
        const a = scoreAssessment([o], { [q.id]: response }) as any;
        const b = scoreAssessment([q], { [q.id]: response }) as any;
        expect(b.axisResults[q.axis].pole1Score, `${q.id}/${response}`).toBe(
          a.axisResults[o.axis].pole1Score
        );
      }
    }
  });


});

describe("윤문 문체 기준", () => {
  const revised = REVISED_IDS.map(id => {
    const q = QUESTION_BY_ID.get(id)!;
    return { id, q, text: `${q.scenario} ${q.optionA} ${q.optionB}` };
  });

  it("성향축 이름을 노출하지 않는다", () => {
    for (const { id, text } of revised) {
      for (const w of AXIS_WORDS) expect(text.includes(w), `${id}: ${w}`).toBe(false);
    }
  });

  it("보고서식 무거운 서술어를 쓰지 않는다", () => {
    for (const { id, text } of revised) {
      for (const w of HEAVY_VERBS) expect(text.includes(w), `${id}: ${w}`).toBe(false);
    }
  });

  it("딱딱한 한자어 명사를 쓰지 않는다", () => {
    for (const { id, text } of revised) {
      for (const w of STIFF_NOUNS) expect(text.includes(w), `${id}: ${w}`).toBe(false);
    }
  });

  it("추상 표현과 지나친 구어체를 쓰지 않는다", () => {
    for (const { id, text } of revised) {
      for (const w of [...ABSTRACT, ...CASUAL]) {
        expect(text.includes(w), `${id}: ${w}`).toBe(false);
      }
    }
  });

  it("상황 15~35자, 선택지 15~40자, 두 선택지 길이차 8자 이내", () => {
    for (const { id, q } of revised) {
      expect(q.scenario.length, `${id} 상황`).toBeGreaterThanOrEqual(15);
      expect(q.scenario.length, `${id} 상황`).toBeLessThanOrEqual(35);
      for (const [k, v] of [["①", q.optionA], ["②", q.optionB]] as [string, string][]) {
        expect(v.length, `${id} ${k}`).toBeGreaterThanOrEqual(15);
        expect(v.length, `${id} ${k}`).toBeLessThanOrEqual(40);
      }
      expect(Math.abs(q.optionA.length - q.optionB.length), `${id} 길이차`).toBeLessThanOrEqual(8);
    }
  });

  it("상황과 선택지가 각각 한 문장이고 두 선택지가 서로 다르다", () => {
    const sentences = (t: string) => t.split(/[.!?]/).filter(x => x.trim().length > 0).length;
    for (const { id, q } of revised) {
      expect(sentences(q.scenario), `${id} 상황`).toBe(1);
      expect(sentences(q.optionA), `${id} ①`).toBe(1);
      expect(sentences(q.optionB), `${id} ②`).toBe(1);
      expect(q.optionA).not.toBe(q.optionB);
    }
  });
});

describe("블라인드 감수 가드", () => {
  const options = QUESTION_BANK.questions.flatMap(q => [
    { text: q.optionA, energy: q.optionAValue, axis: q.axis, id: q.id },
    { text: q.optionB, energy: q.optionBValue, axis: q.axis, id: q.id }
  ]);

  it("방임·무성의처럼 읽히는 표현이 없다", () => {
    for (const o of options) {
      for (const w of ["그냥", "내버려", "대충", "귀찮"]) {
        expect(o.text.includes(w), `${o.id}: ${w}`).toBe(false);
      }
    }
  });

  it("'일단' 같은 즉흥 뉘앙스 표현이 한쪽에 몰리지 않는다", () => {
    const n = options.filter(o => o.text.includes("일단")).length;
    expect(n).toBeLessThanOrEqual(3);
  });

  it("한 축 안에서 특정 단서가 한쪽에만 반복되지 않는다", () => {
    const CUES = [
      "먼저", "바로", "일단", "하나씩", "통째로", "같이", "각자", "서로", "함께",
      "그때그때", "정해두고", "떠올", "또렷", "견줘", "나눠", "크게", "들으",
      "말한", "맞춰", "알아서", "물어", "미리", "그대로", "짚", "살피",
      "그려", "궁리", "갈라", "전한", "따져", "이어서"
    ];
    for (const axis of QUESTION_BANK.axes) {
      for (const cue of CUES) {
        const p1 = options.filter(o => o.energy === axis.pole1 && o.text.includes(cue)).length;
        const p0 = options.filter(o => o.energy === axis.pole0 && o.text.includes(cue)).length;
        // 한쪽 8회 이상 + 반대쪽 2회 이하면 사용자가 방향을 학습할 수 있다
        const learnable = Math.max(p1, p0) >= 8 && Math.min(p1, p0) <= 2;
        expect(learnable, `${axis.label}축 '${cue}' ${p1}:${p0}`).toBe(false);
      }
    }
  });
});
