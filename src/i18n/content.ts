/**
 * 문항·유형 콘텐츠의 locale overlay.
 *
 * 구조 원칙
 * - 한국어 데이터셋이 **구조의 Source of Truth** 다. overlay 는 화면 문구만 덮는다.
 * - 문항 overlay 는 `id`, 유형 overlay 는 `code` 로만 연결한다.
 * - overlay 가 없거나 특정 항목이 비어 있으면 **한국어 원문으로 fallback** 한다.
 *   (번역 placeholder 문장을 만들지 않는다.)
 * - id / axis / pole1 / pole0 / context / optionAValue / optionBValue /
 *   responseScale / active / typeNumber / bitString / code / 에너지 내부 key 는
 *   overlay 대상이 아니며 절대 덮이지 않는다.
 *
 * Stage 1 에서는 영문 overlay 파일이 아직 없다. 아래 두 상수에 파일을 연결하면
 * 그때부터 English 모드에서 해당 문구가 사용된다. 파일이 없어도 빌드는 깨지지 않는다.
 */
import type { Locale } from "./resources";
import { matchType, type ProfileType, type Question } from "../lib/mycore12";
// 승인된 영문 문항 overlay (표시 문구 전용, id 로만 연결된다)
import enQuestions from "../locales/en/questions.json";
// 승인된 영문 유형 overlay (표시 문구 전용, code 로만 연결된다)
import enTypes from "../locales/en/types.json";

/** 문항에서 화면에 보이는 문구만 담는다 */
export interface QuestionOverlay {
  id: string;
  scenario?: string;
  prompt?: string;
  optionA?: string;
  optionB?: string;
}

/** 유형에서 화면에 보이는 문구만 담는다 (구조 필드는 포함하지 않는다) */
export type TypeOverlay = Partial<
  Pick<
    ProfileType,
    | "personaName"
    | "energySignature"
    | "headline"
    | "overview"
    | "strengths"
    | "workStyle"
    | "decisionStyle"
    | "relationshipStyle"
    | "teamContribution"
    | "goodFitSituations"
    | "cautions"
    | "stressSignals"
    | "recoveryStrategies"
    | "selfCoachingQuestions"
    | "encouragement"
    | "interpretationNote"
    | "collaborationGuide"
    | "developmentGuide"
    | "developmentRoadmap"
  >
> & { code: string };

/**
 * English overlay 연결 지점.
 *
 * 문항(Stage 2): 승인본 `src/locales/en/questions.json` 을 그대로 사용한다.
 *   내용은 수정하지 않으며 id 로만 base 문항과 연결된다.
 * 유형(Stage 3): 승인본 `src/locales/en/types.json` 을 그대로 사용한다.
 *   code 로만 base 유형과 연결되며, developmentGuide 의 primaryEnergy /
 *   supportEnergy 는 내부 연결 key 라 한국어 그대로 유지된다(표시는 energy() 가 담당).
 */
const EN_QUESTIONS: QuestionOverlay[] = enQuestions as QuestionOverlay[];
const EN_TYPES: TypeOverlay[] = enTypes as unknown as TypeOverlay[];

const QUESTION_OVERLAYS: Record<Locale, Map<string, QuestionOverlay>> = {
  ko: new Map(),
  en: new Map(EN_QUESTIONS.map(q => [q.id, q]))
};

const TYPE_OVERLAYS: Record<Locale, Map<string, TypeOverlay>> = {
  ko: new Map(),
  en: new Map(EN_TYPES.map(t => [t.code, t]))
};

/** 값이 실제로 있을 때만 덮는다 (빈 문자열·빈 배열은 fallback 유지) */
const pick = <T,>(overlayValue: T | undefined, base: T): T => {
  if (overlayValue === undefined || overlayValue === null) return base;
  if (typeof overlayValue === "string" && overlayValue.trim() === "") return base;
  if (Array.isArray(overlayValue) && overlayValue.length === 0) return base;
  return overlayValue;
};

/**
 * 문항의 화면 문구를 현재 locale 로 바꾼 사본을 돌려준다.
 * 채점에 쓰이는 필드는 원본 그대로 유지된다.
 */
export function localizeQuestion(question: Question, locale: Locale): Question {
  const overlay = QUESTION_OVERLAYS[locale].get(question.id);
  if (!overlay) return question;
  return {
    ...question,
    scenario: pick(overlay.scenario, question.scenario),
    prompt: pick(overlay.prompt, question.prompt),
    optionA: pick(overlay.optionA, question.optionA),
    optionB: pick(overlay.optionB, question.optionB)
  };
}

/**
 * 유형의 화면 문구를 현재 locale 로 바꾼 사본을 돌려준다.
 * typeNumber·bitString·code·preferredEnergies·supportingEnergies·axisPreferences 는
 * 항상 한국어 기준 데이터의 값을 유지한다.
 */
export function localizeType(type: ProfileType, locale: Locale): ProfileType {
  const overlay = TYPE_OVERLAYS[locale].get(type.code);
  if (!overlay) return type;

  const merged: ProfileType = { ...type };
  for (const [key, value] of Object.entries(overlay)) {
    if (key === "code") continue;
    const k = key as keyof ProfileType;
    (merged as unknown as Record<string, unknown>)[k] = pick(
      value as never,
      type[k] as never
    );
  }
  return merged;
}

/** 해당 locale 의 overlay 가 실제로 준비되어 있는지 (테스트·진단용) */
export const hasQuestionOverlay = (locale: Locale) =>
  QUESTION_OVERLAYS[locale].size > 0;
export const hasTypeOverlay = (locale: Locale) =>
  TYPE_OVERLAYS[locale].size > 0;

/**
 * 저장된 결과의 code 로 현재 유형을 찾아 locale 표시 콘텐츠를 적용한다.
 *
 * 과거 결과에 저장된 `typePersonaName` 문자열은 저장 시점의 한국어 이름이므로
 * 표시 출처로 쓰지 않는다. 항상 code → 현재 유형 → locale overlay 순서로 만든다.
 * 매칭에 실패하면 null 을 돌려주고 화면에서 안내를 띄운다.
 */
export function localizedTypeByCode(
  code: string,
  locale: Locale
): ProfileType | null {
  try {
    return localizeType(matchType(code), locale);
  } catch {
    return null;
  }
}
