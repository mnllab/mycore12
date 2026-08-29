/**
 * 결과 콘텐츠 v3.0 전수 검수 (2026-08-29 확정).
 *
 * v3.0은 64유형 전체가 "쉽게 읽히는 정제된 설명체"로 개편된 정식 운영 데이터다.
 * - 이름 정책: 공백 포함 14자 이하 / 64개 고유 / 우열 표현 금지 /
 *   낯선 외래어 금지(오케스트레이터는 111111 단독 예외) / 추상어 금지(001100 '개념'은 기승인 예외)
 * - 문체 정책: 어려운 한자어·추상 표현 금지, 명령형 구어체 금지, 본문 가운데점 금지
 * - 구조 정책: v2.2와 필드·항목 수·에너지 데이터 동일 (채점·매칭 영향 없음)
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  TYPE_DATASET,
  TYPE_DATASET_VERSION,
  matchType,
  publicInterpretationNote
} from "../src/lib/mycore12";

const ROOT = join(__dirname, "..");
const V22 = JSON.parse(
  readFileSync(join(ROOT, "src/data/positive_64_type_dataset_bundle_v2.2.json"), "utf8")
);
const ALL = TYPE_DATASET.types;
const o22 = new Map(V22.types.map((t: any) => [t.bitString, t]));

/** 화면에 노출되는 텍스트 모음 (interpretationNote는 표시 함수 통과본) */
const textsOf = (t: any): string[] => [
  t.headline, t.overview, t.workStyle, t.decisionStyle, t.relationshipStyle,
  t.teamContribution, t.encouragement, publicInterpretationNote(t.interpretationNote),
  ...t.strengths, ...t.cautions, ...t.goodFitSituations,
  ...t.stressSignals, ...t.recoveryStrategies, ...t.selfCoachingQuestions,
  ...t.collaborationGuide.worksWellWhen, ...t.collaborationGuide.mayStruggleWhen,
  t.collaborationGuide.bestFeedbackStyle,
  ...Object.values(t.developmentRoadmap) as string[],
  ...t.developmentGuide.flatMap((g: any) => [
    g.whyItHelps, g.overuseSignal, g.practice, g.matureStrength
  ])
];
const sentencesOf = (t: any): string[] =>
  textsOf(t)
    .flatMap(s => s.split(/(?<=[.?])\s+/))
    .map(s => s.trim())
    .filter(Boolean);

describe("v3.0 연결", () => {
  it("앱이 v3.0 데이터셋을 사용하고 버전이 결과 기록에 남는다", () => {
    expect(String(TYPE_DATASET.metadata.version)).toBe("3.0.0");
    expect(TYPE_DATASET_VERSION).toBe("3.0");
  });

  it("matchType은 데이터셋을 그대로 반환한다 (표시 단계 덧씌우기 없음)", () => {
    for (const t of ALL) {
      const m = matchType(t.code);
      expect(m.personaName, t.code).toBe(t.personaName);
      expect(m.overview, t.code).toBe(t.overview);
      expect(m.headline, t.code).toBe(t.headline);
    }
  });
});

describe("personaName 확정 정책 (64유형 전수)", () => {
  it("이름이 바뀐 유형은 v2.1 이름을 legacyPersonaName으로 보존한다", () => {
    let revised = 0;
    for (const t of ALL as any[]) {
      if (t.legacyPersonaName) {
        expect(t.legacyPersonaName).not.toBe(t.personaName);
        revised++;
      }
    }
    expect(revised).toBe(34);
  });

  it("공백 포함 14자 이하이고 64개가 서로 겹치지 않는다", () => {
    const names = ALL.map(t => t.personaName);
    for (const n of names) expect(n.length, n).toBeLessThanOrEqual(14);
    expect(new Set(names).size).toBe(64);
  });

  it("낯선 외래어를 쓰지 않는다 (오케스트레이터는 111111 단독 예외)", () => {
    const FOREIGN = [
      "아키텍트", "디렉터", "매니저", "코디네이터", "퍼실리테이터", "시너지", "인사이트"
    ];
    for (const t of ALL) {
      for (const w of FOREIGN) expect(t.personaName.includes(w), `${t.personaName}: ${w}`).toBe(false);
      if (t.bitString !== "111111") {
        expect(t.personaName.includes("오케스트레이터"), t.personaName).toBe(false);
      }
    }
    expect(ALL.find(t => t.bitString === "111111")?.personaName).toContain("오케스트레이터");
  });

  it("추상어를 쓰지 않는다 ('개념'은 001100 기승인 예외)", () => {
    const ABSTRACT = ["가능성", "통합 에너지", "에너지"];
    for (const t of ALL) {
      for (const w of ABSTRACT) expect(t.personaName.includes(w), `${t.personaName}: ${w}`).toBe(false);
      if (t.bitString !== "001100") {
        expect(t.personaName.includes("개념"), t.personaName).toBe(false);
      }
    }
  });

  it("우월하게 들리는 표현을 쓰지 않는다", () => {
    const SUPERIOR = ["최고", "완벽", "만능", "탁월", "우수", "뛰어난", "천재"];
    for (const t of ALL) {
      for (const w of SUPERIOR) expect(t.personaName.includes(w), t.personaName).toBe(false);
    }
  });

  it("본문에 확정 이름이 반영되고 옛 이름이 남지 않는다 (전수)", () => {
    for (const t of ALL as any[]) {
      expect(t.overview, t.code).toContain(t.personaName);
      if (t.legacyPersonaName) {
        const body = JSON.stringify({ ...t, legacyPersonaName: undefined });
        expect(body.includes(t.legacyPersonaName), `${t.code}: ${t.legacyPersonaName}`).toBe(false);
      }
    }
  });

  it("headline은 personaName을 반복하지 않고 64개가 서로 다르다", () => {
    const heads = ALL.map(t => t.headline);
    expect(new Set(heads).size).toBe(64);
    for (const t of ALL) {
      expect(t.headline.includes(t.personaName), t.code).toBe(false);
    }
  });
});

describe("문체 기준 (64유형 전수)", () => {
  const HARD = [
    "의사결정", "상호작용", "구조화", "통합적", "활용", "탐색", "기여", "요인",
    "시사", "발현", "잠재", "언어화", "구현", "인과관계", "수용 가능성",
    "요구사항", "맥락", "구체화", "효과적", "최적화", "메커니즘",
    "가시화", "내재화", "다각적", "효율성", "유기적"
  ];
  const BANNED = [
    "에 기반하여", "로 작용합니다", "에 기여합니다", "를 시사합니다",
    "부족하다", "약하다", "결핍", "미흡", "개선해야", "낮은 성향",
    "우수한", "뛰어난", "라고 할 수 있습니다", "에 있어서",
    "해보세요", "해 보세요", "하세요", "보세요", "해볼까요", "어떨까요",
    "괜찮아요", "좋을 것 같아요", "일지도 몰라요",
    "당신은 충분히 훌륭", "무한한 가능성"
  ];

  it("어려운 표현과 구어체·금지 표현을 쓰지 않는다", () => {
    for (const t of ALL) {
      const nameFree = (s: string) => s.split(t.personaName).join("");
      for (const s of textsOf(t).map(nameFree)) {
        for (const w of HARD) expect(s.includes(w), `${t.code}: ${w} → ${s.slice(0, 60)}`).toBe(false);
        for (const w of BANNED) expect(s.includes(w), `${t.code}: ${w} → ${s.slice(0, 60)}`).toBe(false);
      }
    }
  });

  it("본문에 가운데점을 쓰지 않는다 (typeName·energySignature 고정 표기 제외)", () => {
    for (const t of ALL) {
      for (const s of textsOf(t)) {
        expect(s.includes("·"), `${t.code}: ${s.slice(0, 60)}`).toBe(false);
      }
    }
  });

  it("화면 문장이 짧다 (평균 42자 이하, 70자 초과 없음)", () => {
    for (const t of ALL) {
      const sentences = sentencesOf(t);
      const avg = sentences.reduce((a, s) => a + s.length, 0) / sentences.length;
      expect(avg, `${t.code} 평균 ${avg.toFixed(1)}자`).toBeLessThanOrEqual(42);
      for (const s of sentences) {
        expect(s.length, `${t.code} 70자 초과: ${s}`).toBeLessThanOrEqual(70);
      }
    }
  });

  it("해석 안내에 내부 코드가 노출되지 않고 핵심 안내가 담긴다", () => {
    for (const t of ALL) {
      const shown = publicInterpretationNote(t.interpretationNote);
      expect(/\d-\d-\d-\d-\d-\d|\b[01]{6}\b/.test(shown), t.code).toBe(false);
      expect(shown).toContain("12가지 에너지");
      expect(shown).toContain("우열이 아니라");
    }
  });
});

describe("구조·의미 보존 (v2.2 대비)", () => {
  it("코드·이름·에너지 서명·선호/보완 에너지가 바뀌지 않았다", () => {
    for (const t of ALL as any[]) {
      const b: any = o22.get(t.bitString);
      expect(t.code).toBe(b.code);
      expect(t.typeNumber).toBe(b.typeNumber);
      expect(t.typeName).toBe(b.typeName);
      expect(t.personaName, t.code).toBe(b.personaName);
      expect(t.energySignature).toBe(b.energySignature);
      expect(t.preferredEnergies).toEqual(b.preferredEnergies);
      expect(t.supportingEnergies).toEqual(b.supportingEnergies);
      expect(t.axisPreferences).toEqual(b.axisPreferences);
    }
  });

  it("항목 수가 v2.2와 같다 (정보량 유지)", () => {
    for (const t of ALL as any[]) {
      const b: any = o22.get(t.bitString);
      expect(t.strengths, t.code).toHaveLength(b.strengths.length);
      expect(t.cautions, t.code).toHaveLength(b.cautions.length);
      expect(t.goodFitSituations, t.code).toHaveLength(b.goodFitSituations.length);
      expect(t.stressSignals, t.code).toHaveLength(b.stressSignals.length);
      expect(t.recoveryStrategies, t.code).toHaveLength(b.recoveryStrategies.length);
      expect(t.selfCoachingQuestions, t.code).toHaveLength(b.selfCoachingQuestions.length);
      expect(t.developmentGuide, t.code).toHaveLength(b.developmentGuide.length);
      expect(Object.keys(t.developmentRoadmap)).toEqual(Object.keys(b.developmentRoadmap));
    }
  });

  it("보완 에너지 방향이 v2.2와 일치한다", () => {
    for (const t of ALL as any[]) {
      const b: any = o22.get(t.bitString);
      expect(t.developmentGuide.map((g: any) => [g.primaryEnergy, g.supportEnergy])).toEqual(
        b.developmentGuide.map((g: any) => [g.primaryEnergy, g.supportEnergy])
      );
    }
  });

  it("유형 간 분량이 균형적이다 (000000 대 111111 포함)", () => {
    const vol = (t: any) => textsOf(t).join("").length;
    const vols = ALL.map(vol);
    const t0 = vol(ALL.find(t => t.bitString === "000000"));
    const t1 = vol(ALL.find(t => t.bitString === "111111"));
    expect(Math.abs(t0 - t1) / Math.max(t0, t1)).toBeLessThan(0.05);
    expect(Math.min(...vols) / Math.max(...vols)).toBeGreaterThan(0.9);
  });
});
