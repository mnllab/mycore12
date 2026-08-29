/**
 * 마이코어12(MYCORE12) 데이터 접근 레이어.
 * 원본 데이터 파일과 엔진을 Source of Truth로 유지하고,
 * 이 파일은 타입과 매칭/파생값(예: isBalanced)만 담당한다.
 */
import typeDatasetRaw from "../data/positive_64_type_dataset_bundle_v2.1.json";
// 엔진이 참조하는 것과 동일한 원본 문항은행 ES Module
import { POSITIVE_QUESTION_BANK } from "../vendor/positive_144_situational_question_bank_FINAL_v3.1.js";

export interface AxisDef {
  axis: string;
  label: string;
  pole1: string;
  pole0: string;
  bankSize: number;
}

export interface ContextDef {
  context: string;
  label: string;
  itemsPerAxis: number;
}

export interface Question {
  id: string;
  axis: string;
  axisLabel: string;
  pole1: string;
  pole0: string;
  context: string;
  contextLabel: string;
  scenario: string;
  prompt: string;
  optionA: string;
  optionB: string;
  optionAValue: string;
  optionBValue: string;
  responseScale: Record<string, string>;
  active: boolean;
}

export interface AxisResult {
  axisLabel: string;
  pole1: string;
  pole0: string;
  pole1Points: number;
  pole0Points: number;
  itemCount: number;
  pole1Score: number;
  pole0Score: number;
}

export interface ScoreResult {
  code: string;
  bitString: string;
  preferredEnergies: string[];
  energyScores: Record<string, number>;
  axisResults: Record<string, AxisResult>;
}

export interface DevelopmentGuideItem {
  primaryEnergy: string;
  supportEnergy: string;
  whyItHelps: string;
  overuseSignal: string;
  practice: string;
  matureStrength: string;
}

export interface ProfileType {
  typeNumber: number;
  bitString: string;
  code: string;
  typeName: string;
  personaName: string;
  energySignature: string;
  headline: string;
  preferredEnergies: string[];
  supportingEnergies: string[];
  axisPreferences: {
    axisKey: string;
    axisLabel: string;
    bit: 0 | 1;
    preferredEnergy: string;
    supportingEnergy: string;
    pair: [string, string];
  }[];
  overview: string;
  strengths: string[];
  workStyle: string;
  decisionStyle: string;
  relationshipStyle: string;
  collaborationGuide: {
    worksWellWhen: string[];
    mayStruggleWhen: string[];
    bestFeedbackStyle: string;
  };
  teamContribution: string;
  goodFitSituations: string[];
  cautions: string[];
  developmentGuide: DevelopmentGuideItem[];
  developmentRoadmap: { startNow: string; next30Days: string; longTerm: string };
  stressSignals: string[];
  recoveryStrategies: string[];
  selfCoachingQuestions: string[];
  encouragement: string;
  interpretationNote: string;
}

export const QUESTION_BANK = POSITIVE_QUESTION_BANK as unknown as {
  framework: string;
  version: string;
  questionBankSize: number;
  questionsPerAssessment: number;
  axes: AxisDef[];
  contexts: ContextDef[];
  questions: Question[];
  brand?: unknown;
};

export const TYPE_DATASET = typeDatasetRaw as unknown as {
  metadata: Record<string, unknown>;
  types: ProfileType[];
};

export const BANK_VERSION: string = QUESTION_BANK.version;
export const TYPE_DATASET_VERSION = "2.1";
export const ENGINE_VERSION = "FINAL_v3.1";

export const AXES: AxisDef[] = QUESTION_BANK.axes;
export const QUESTION_BY_ID: Map<string, Question> = new Map(
  QUESTION_BANK.questions.map(q => [q.id, q])
);

/** 6개 pair family 색상 (구분 보조용 — 우열 의미 없음, 텍스트 라벨 병행) */
export const PAIR_FAMILY: Record<
  string,
  { hue: string; soft: string; strong: string }
> = {
  action: { hue: "amber", soft: "#F6E7C9", strong: "#B07C24" },
  collaboration: { hue: "teal", soft: "#D4EAE7", strong: "#2A7A72" },
  ideation: { hue: "violet", soft: "#E4DEF2", strong: "#6A5AA8" },
  judgment: { hue: "blue", soft: "#D9E5F2", strong: "#3A6698" },
  relationship: { hue: "rose", soft: "#F4DEE2", strong: "#A85566" },
  operation: { hue: "green", soft: "#DBEAD9", strong: "#4A7C4E" }
};

/** 12에너지 → 소속 축 매핑 */
export const ENERGY_TO_AXIS: Record<string, AxisDef> = {};
for (const axis of AXES) {
  ENERGY_TO_AXIS[axis.pole1] = axis;
  ENERGY_TO_AXIS[axis.pole0] = axis;
}

/** Energy Map에 표시할 12에너지 고정 순서: 축 순서대로 pole1 6개 → 반대편에 pole0 6개 */
export const ENERGY_RING_ORDER: string[] = [
  ...AXES.map(a => a.pole1),
  ...AXES.map(a => a.pole0)
];

/** 채점 code → 64유형 매칭. 실패 시 조용히 넘어가지 않고 명시적 오류를 낸다. */
export function matchType(code: string): ProfileType {
  const matched = TYPE_DATASET.types.find(t => t.code === code);
  if (!matched) {
    throw new Error(`마이코어12 유형 매칭 실패: code=${code} 가 유형 데이터셋에 없습니다.`);
  }
  return matched;
}

/** UI 전용 파생값: 정확히 50:50인 축은 "균형 지점"으로 표시 (엔진 원본은 수정하지 않음) */
export function isBalancedAxis(r: AxisResult): boolean {
  return r.pole1Score === 50;
}

/**
 * 공식 브랜드 상수 — 화면·metadata·문서에서 이 값만 사용한다.
 * 한글 브랜드명이 주 브랜드, MYCORE12는 영문/보조 브랜드명이다.
 */
export const BRAND = {
  nameKo: "마이코어12",
  nameEn: "MYCORE12",
  slug: "mycore12",
  lockup: "마이코어12 · MYCORE12",
  tagline: "나를 이루는 12가지 에너지",
  descriptor: "6축 기반 성향 프로파일",
  copyright: "© Janggil Kim. All Rights Reserved.",
  copyrightKo: "무단 복제 및 재배포를 금지합니다."
} as const;

/**
 * 사용자 화면용 interpretationNote.
 *
 * 원본 interpretationNote는 64유형 전부가 "내부 코드는 0-0-0-0-0-0이며 1은 …"처럼
 * 내부 0/1 코드 설명과 화면 표시 지침을 포함한다. 데이터는 그대로 두고(Source of Truth),
 * 사용자에게 0/1 코드가 노출되지 않도록 해당 문장만 표시 단계에서 제외한다.
 */
const INTERNAL_NOTE_PATTERNS = [
  /내부\s*코드/,
  /\d-\d-\d-\d-\d-\d/,
  /\b[01]{6}\b/,
  /1은\s*각\s*축/,
  /1과\s*0은/,
  /사용자\s*화면에서는/
];

export function publicInterpretationNote(note: string): string {
  return note
    .split(/(?<=다\.)\s+/)
    .filter(sentence => !INTERNAL_NOTE_PATTERNS.some(p => p.test(sentence)))
    .join(" ")
    .trim();
}
