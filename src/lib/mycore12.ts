/**
 * 마이코어12(MYCORE12) 데이터 접근 레이어.
 * 원본 데이터 파일과 엔진을 Source of Truth로 유지하고,
 * 이 파일은 타입과 매칭/파생값(예: isBalanced)만 담당한다.
 */
import typeDatasetRaw from "../data/MYCORE12_64_type_dataset_v3.0.json";
// 운영 문항은행 v3.2 — v3.1 의 표시 문구를 윤문한 정식 버전
import questionBankV32 from "../data/positive_144_situational_question_bank_FINAL_v3.2.json";
// v3.1 원본 (엔진이 추출·채점에 사용하는 모듈과 동일본, 비교·검증용)
import { POSITIVE_QUESTION_BANK as QUESTION_BANK_V31 } from "../vendor/positive_144_situational_question_bank_FINAL_v3.1.js";

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
  /** 파일럿 유형에만 존재 — 이름 변경 전 원래 이름 */
  legacyPersonaName?: string;
}

/**
 * 운영 문항은행 (v3.2).
 *
 * v3.1 대비 12문항의 scenario / optionA / optionB 만 윤문했고,
 * id · axis · context · optionAValue · optionBValue · responseScale · active 는
 * 전부 동일하다. 따라서 추출(drawAssessment)·채점(scoreAssessment) 결과는
 * v3.1 과 완전히 같다. 엔진은 원본 v3.1 모듈을 그대로 사용하고,
 * 화면과 문항 조회는 이 v3.2 를 사용한다.
 */
export const QUESTION_BANK = questionBankV32 as unknown as {
  framework: string;
  version: string;
  questionBankSize: number;
  questionsPerAssessment: number;
  axes: AxisDef[];
  contexts: ContextDef[];
  questions: Question[];
  previousVersion?: string;
  brand?: unknown;
};

/** v3.1 원본 문항은행 (윤문 전 문구 비교·검증용) */
export const QUESTION_BANK_ORIGINAL = QUESTION_BANK_V31 as unknown as {
  version: string;
  questions: Question[];
};

export const TYPE_DATASET = typeDatasetRaw as unknown as {
  metadata: Record<string, unknown>;
  types: ProfileType[];
};

export const BANK_VERSION: string = QUESTION_BANK.version;
/** 결과 기록용 짧은 문항은행 버전 (예: "3.2") */
export const QUESTION_BANK_VERSION: string = QUESTION_BANK.version
  .split("-")[0]
  .split(".")
  .slice(0, 2)
  .join("."); // major.minor 만 기록 (패치 단위는 채점에 영향 없음)
/** 결과 기록용 유형 데이터 버전 (metadata.version의 major.minor, 예: "3.0") */
export const TYPE_DATASET_VERSION: string = String(TYPE_DATASET.metadata.version ?? "3.0")
  .split(".")
  .slice(0, 2)
  .join(".");
export const ENGINE_VERSION = "FINAL_v3.1";

export const AXES: AxisDef[] = QUESTION_BANK.axes;
/** 화면·세션 복원에 사용하는 문항 조회표 (v3.2) */
export const QUESTION_BY_ID: Map<string, Question> = new Map(
  QUESTION_BANK.questions.map(q => [q.id, q])
);

/** v3.1 문항 조회표 (윤문 전후 비교·검증용) */
export const ORIGINAL_QUESTION_BY_ID: Map<string, Question> = new Map(
  QUESTION_BANK_ORIGINAL.questions.map(q => [q.id, q])
);

/**
 * 축 구분용 색상.
 * 무지개식 배색을 피하고 muted indigo ~ slate 단일 계열 안에서만
 * 아주 제한적으로 명도 variation 을 둔다. 색은 보조 수단이며
 * 항상 텍스트 라벨을 병행한다.
 */
export const PAIR_FAMILY: Record<string, { strong: string; soft: string }> = {
  action: { strong: "#4338CA", soft: "#EEF2FF" },
  collaboration: { strong: "#4F46E5", soft: "#EEF2FF" },
  ideation: { strong: "#5B54D6", soft: "#F0F1FE" },
  judgment: { strong: "#4C5578", soft: "#EFF1F6" },
  relationship: { strong: "#475569", soft: "#F1F5F9" },
  operation: { strong: "#55607A", soft: "#F0F2F6" }
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

/**
 * 결과 콘텐츠 v3.0 — 64유형 전체가 "쉽게 읽히는 정제된 설명체"로 확정됨 (2026-08-29).
 * 확정 데이터셋이 Source of Truth이며, 표시 단계에서 문장을 덧씌우는
 * 파일럿 패치는 v3.0 반영과 함께 종료되었다 (이력: positive_64_type_plain_pilot_v2.3.json).
 * personaName 은 데이터셋 값을 그대로 사용한다 (별도 매핑 없음).
 */

/** 채점 code → 64유형 매칭. 실패 시 조용히 넘어가지 않고 명시적 오류를 낸다. */
export function matchType(code: string): ProfileType {
  const matched = TYPE_DATASET.types.find(t => t.code === code);
  if (!matched) {
    throw new Error(`마이코어12 유형 매칭 실패: code=${code} 가 유형 데이터셋에 없습니다.`);
  }
  return matched;
}

/** 원본(파일럿 적용 전) 유형 조회 — 비교·검증용 */
export function matchTypeOriginal(code: string): ProfileType {
  const matched = TYPE_DATASET.types.find(t => t.code === code);
  if (!matched) throw new Error(`유형 없음: ${code}`);
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
  copyrightKo: "저작권자의 허락 없이 무단 복제 및 재배포를 금지합니다."
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
