/**
 * 검사 길이별 층화 추출 (18 / 36 / 54 / 72).
 *
 * 원본 엔진(positive_assessment_engine_FINAL_v3.1.js)은 36문항 고정이라
 * 길이 선택을 위해 추출부만 이 모듈로 옮긴다. 엔진 파일과 채점 함수
 * scoreAssessment()는 수정하지 않는다.
 *
 * 문항은행 구조: 6축 × 6상황 × A방향 2종 × 2문항 = 144문항.
 * 따라서 (축, 상황, A방향) 조합마다 후보가 정확히 2개 있다.
 *
 * 우선순위 (스펙 31)
 *   1) 축 균형  2) 상황 균형  3) A/B 방향 균형  4) 최근 문항 회피
 * 최근 문항 회피는 앞의 세 조건을 깨면서까지 적용하지 않는다.
 */
import { POSITIVE_QUESTION_BANK } from "../vendor/positive_144_situational_question_bank_FINAL_v3.1.js";
import type { Question } from "./mycore12";

export type AssessmentLength = 18 | 36 | 54 | 72;

export const ASSESSMENT_LENGTHS: AssessmentLength[] = [18, 36, 54, 72];
export const DEFAULT_ASSESSMENT_LENGTH: AssessmentLength = 36;

export const isAssessmentLength = (v: unknown): v is AssessmentLength =>
  ASSESSMENT_LENGTHS.includes(v as AssessmentLength);

/** 검사 길이 선택 화면에 쓰는 설명 (우열이 아니라 범위의 차이로 적는다) */
export const LENGTH_OPTIONS: {
  length: AssessmentLength;
  title: string;
  tagline: string;
  recommended?: boolean;
  description: string;
}[] = [
  {
    length: 18,
    title: "18문항",
    tagline: "빠르게 보기",
    description: "핵심적인 성향을 간단히 확인합니다."
  },
  {
    length: 36,
    title: "36문항",
    tagline: "표준 검사",
    recommended: true,
    description: "6가지 상황을 고르게 반영해 성향을 균형 있게 살펴봅니다."
  },
  {
    length: 54,
    title: "54문항",
    tagline: "자세히 보기",
    description: "더 많은 상황을 반영해 결과를 조금 더 세밀하게 살펴봅니다."
  },
  {
    length: 72,
    title: "72문항",
    tagline: "깊이 있게 보기",
    description: "각 상황을 더 충분히 반영해 성향을 자세히 살펴봅니다."
  }
];

const AXES = POSITIVE_QUESTION_BANK.axes as {
  axis: string;
  label: string;
  pole1: string;
  pole0: string;
}[];
const CONTEXTS = (POSITIVE_QUESTION_BANK.contexts as { context: string }[]).map(
  c => c.context
);
const ACTIVE = (POSITIVE_QUESTION_BANK.questions as Question[]).filter(q => q.active);

const shuffle = <T,>(arr: T[], rng: () => number): T[] => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** 축 하나가 쓸 (상황, A방향) 슬롯 계획을 만든다. */
function planAxisSlots(
  axisIndex: number,
  axis: { pole1: string; pole0: string },
  length: AssessmentLength,
  rng: () => number
): { context: string; requiredAValue: string }[] {
  const n = CONTEXTS.length; // 6
  const perAxis = length / 6;

  // 72문항: 상황마다 정확히 2문항, 각 상황에서 A방향을 하나씩 → 축별 6:6
  if (length === 72) {
    return CONTEXTS.flatMap(context => [
      { context, requiredAValue: axis.pole1 },
      { context, requiredAValue: axis.pole0 }
    ]);
  }

  // 상황 선택
  let contexts: string[];
  if (length === 18) {
    // 축마다 서로 다른 3개 상황을 건너뛰며 고른다 → 세션 전체에서 상황당 3문항
    contexts = [0, 1, 2].map(k => CONTEXTS[(axisIndex + k * 2) % n]);
  } else if (length === 36) {
    contexts = [...CONTEXTS];
  } else {
    // 54문항: 6개 상황 1회씩 + 추가 3개 상황(축별로 회전) → 세션 전체에서 상황당 9문항
    const extras = [0, 1, 2].map(k => CONTEXTS[(axisIndex + k) % n]);
    contexts = [...CONTEXTS, ...extras];
  }

  // A방향 목표 개수: 홀수 길이는 축마다 방향을 번갈아 배정해 세션 전체를 반반으로 맞춘다
  const target1 =
    perAxis % 2 === 0
      ? perAxis / 2
      : axisIndex % 2 === 0
        ? Math.ceil(perAxis / 2)
        : Math.floor(perAxis / 2);

  const order = shuffle(contexts, rng);
  return order.map((context, i) => ({
    context,
    requiredAValue: i < target1 ? axis.pole1 : axis.pole0
  }));
}

/**
 * 선택한 길이만큼 문항을 뽑는다. 표시 순서 보정은 호출부(spreadByAxis)에서 한다.
 */
export function drawAssessmentByLength({
  length = DEFAULT_ASSESSMENT_LENGTH,
  recentlySeenIds = [],
  rng = Math.random
}: {
  length?: AssessmentLength;
  recentlySeenIds?: string[];
  rng?: () => number;
} = {}): Question[] {
  if (!isAssessmentLength(length)) {
    throw new Error(`지원하지 않는 검사 길이입니다: ${length}`);
  }

  const recent = new Set(recentlySeenIds);
  const used = new Set<string>();
  const selected: Question[] = [];

  AXES.forEach((axis, axisIndex) => {
    const axisItems = ACTIVE.filter(q => q.axis === axis.axis);

    for (const slot of planAxisSlots(axisIndex, axis, length, rng)) {
      const bucket = axisItems.filter(
        q =>
          q.context === slot.context &&
          q.optionAValue === slot.requiredAValue &&
          !used.has(q.id)
      );
      if (bucket.length === 0) {
        throw new Error(
          `문항 추출 실패: ${axis.axis}/${slot.context}/${slot.requiredAValue} 후보가 없습니다.`
        );
      }

      // 구조 조건을 만족하는 후보 안에서만 최근 출제 문항을 피한다
      const unseen = bucket.filter(q => !recent.has(q.id));
      const pool = unseen.length > 0 ? unseen : bucket;
      const picked = pool[Math.floor(rng() * pool.length)];

      used.add(picked.id);
      selected.push(picked);
    }
  });

  return shuffle(selected, rng);
}
