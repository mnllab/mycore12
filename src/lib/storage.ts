/**
 * 로컬 저장 레이어 (localStorage) — 마이코어12(MYCORE12).
 * - 진행 중 세션: 새로고침 시 동일 문항 구성·검사 길이·답변을 복원
 * - 최근 문항 ID: 재검사 시 recentlySeenIds로 전달 (최근 3회)
 * - 결과 기록: 유형·점수·버전 저장, 삭제 기능 제공
 */
import { scoreAssessment } from "../vendor/positive_assessment_engine_FINAL_v3.1.js";
import { spreadByAxis } from "./ordering";
import {
  DEFAULT_ASSESSMENT_LENGTH,
  drawAssessmentByLength,
  isAssessmentLength,
  type AssessmentLength
} from "./draw";
import {
  BANK_VERSION,
  QUESTION_BANK_VERSION,
  ENGINE_VERSION,
  TYPE_DATASET_VERSION,
  QUESTION_BY_ID,
  matchType,
  type Question,
  type ScoreResult
} from "./mycore12";

const K_SESSION = "mycore12.activeSession.v1";
const K_RECENT = "mycore12.recentQuestionIds.v1";
const K_RESULTS = "mycore12.results.v1";
const RECENT_KEEP_ASSESSMENTS = 3;

/**
 * 로컬에 저장되는 데이터의 버전 지문.
 * 문항은행·엔진·유형 데이터 중 하나라도 바뀌면 값이 달라진다.
 */
const DATA_VERSION = `${BANK_VERSION}|${ENGINE_VERSION}|${TYPE_DATASET_VERSION}`;
const K_DATA_VERSION = "mycore12.dataVersion";

/**
 * 정리 대상 key 전체 (현행 + 구 브랜드 시절 잔여물).
 * 구 key 는 값을 옮기지 않고 지우기만 한다.
 */
const ALL_KNOWN_KEYS = [
  K_SESSION,
  K_RECENT,
  K_RESULTS,
  K_DATA_VERSION,
  "core12.activeSession.v1", // 구 브랜드 잔여물 — 삭제 전용
  "core12.recentQuestionIds.v1", // 구 브랜드 잔여물 — 삭제 전용
  "core12.results.v1" // 구 브랜드 잔여물 — 삭제 전용
];

export interface AssessmentSession {
  sessionId: string;
  startedAt: string;
  questionIds: string[];
  answers: Record<string, 1 | 2 | 3 | 4 | 5>;
  currentIndex: number;
  /** 이 세션의 문항 수 — 시작할 때 확정되고 검사 중에는 바뀌지 않는다 */
  assessmentLength: AssessmentLength;
  bankVersion: string;
  engineVersion: string;
}

export interface StoredAssessmentResult {
  sessionId: string;
  completedAt: string;
  questionIds: string[];
  answers: Record<string, number>;
  code: string;
  preferredEnergies: string[];
  energyScores: Record<string, number>;
  axisResults: ScoreResult["axisResults"];
  typePersonaName: string;
  /** 이 결과가 사용한 문항 수. 과거 결과에는 없을 수 있다(기존 표준 36문항). */
  assessmentLength?: AssessmentLength;
  bankVersion: string;
  /** 짧은 문항은행 버전 표기 (예: "3.2"). 과거 결과에는 없을 수 있다. */
  questionBankVersion?: string;
  engineVersion: string;
  typeDatasetVersion: string;
}

/**
 * 앱 시작 시 1회 실행.
 *
 * 데이터 버전이 직전 실행과 다르면 **문항은행에 묶여 있는 상태**만 정리한다.
 *   - 진행 중 세션: 삭제 (출제된 문항 문구가 바뀌었을 수 있다)
 *   - 최근 출제 문항 이력: 삭제
 *   - 완료된 결과 기록: 보존
 *
 * 완료 결과는 응답·점수·유형코드와 자신이 사용한 버전을 모두 담고 있는
 * 독립 스냅숏이라 문항 문구가 바뀌어도 그대로 열린다. 과거 결과의 버전
 * 표기는 덮어쓰지 않는다.
 *
 * 구 브랜드 시절의 잔여 key 는 값을 옮기지 않고 삭제만 한다.
 */
export function resetStaleLocalData(): { reset: boolean; from: string | null } {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(K_DATA_VERSION);
  } catch {
    return { reset: false, from: null };
  }

  if (stored === DATA_VERSION) return { reset: false, from: stored };

  const KEYS_TO_CLEAR = ALL_KNOWN_KEYS.filter(k => k !== K_RESULTS && k !== K_DATA_VERSION);
  for (const key of KEYS_TO_CLEAR) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* 저장 불가 환경에서도 앱은 계속 동작한다 */
    }
  }
  try {
    localStorage.setItem(K_DATA_VERSION, DATA_VERSION);
  } catch {
    /* noop */
  }
  return { reset: true, from: stored };
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 불가 환경에서도 앱 자체는 동작 */
  }
}

export function getRecentQuestionIds(): string[] {
  const sets = read<string[][]>(K_RECENT) ?? [];
  return sets.flat();
}

function pushRecentQuestionIds(ids: string[]) {
  const sets = read<string[][]>(K_RECENT) ?? [];
  sets.push(ids);
  while (sets.length > RECENT_KEEP_ASSESSMENTS) sets.shift();
  write(K_RECENT, sets);
}

export function getActiveSession(): AssessmentSession | null {
  const s = read<AssessmentSession>(K_SESSION);
  if (!s || !Array.isArray(s.questionIds)) return null;
  // 검사 길이는 시작할 때 확정된다. 저장값과 문항 수가 어긋난 세션은 복원하지 않는다.
  const length = s.assessmentLength ?? (s.questionIds.length as AssessmentLength);
  if (!isAssessmentLength(length) || s.questionIds.length !== length) return null;
  // 데이터 버전이 다른 세션은 복원하지 않는다 (새 검사로 시작)
  if (s.bankVersion !== BANK_VERSION) return null;

  // 저장 데이터가 손상되었거나 문항은행에 없는 ID가 섞인 세션은 복원하지 않는다.
  // (복원 후 questionsOf()에서 throw 되어 화면이 비는 것을 막는다)
  if (s.questionIds.some(id => !QUESTION_BY_ID.has(id))) return null;
  if (new Set(s.questionIds).size !== s.questionIds.length) return null;
  if (!s.answers || typeof s.answers !== "object") return null;
  for (const [id, value] of Object.entries(s.answers)) {
    if (!s.questionIds.includes(id)) return null;
    if (![1, 2, 3, 4, 5].includes(Number(value))) return null;
  }
  if (
    typeof s.currentIndex !== "number" ||
    !Number.isInteger(s.currentIndex) ||
    s.currentIndex < 0 ||
    s.currentIndex > length - 1
  ) {
    return { ...s, assessmentLength: length, currentIndex: 0 };
  }
  return { ...s, assessmentLength: length };
}

/**
 * 검사를 새로 시작할 때만 호출 — 선택한 길이로 문항을 추출한다.
 * questionIds 는 여기서 한 번 만들어지고 그 세션 동안 고정된다.
 */
export function startNewSession(
  length: AssessmentLength = DEFAULT_ASSESSMENT_LENGTH
): AssessmentSession {
  // 뽑은 문항 집합은 그대로 두고, 표시 순서만 축이 연속되지 않게 보정한다
  const items = spreadByAxis(
    drawAssessmentByLength({ length, recentlySeenIds: getRecentQuestionIds() })
  );
  const session: AssessmentSession = {
    sessionId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    startedAt: new Date().toISOString(),
    questionIds: items.map(q => q.id),
    answers: {},
    currentIndex: 0,
    assessmentLength: length,
    bankVersion: BANK_VERSION,
    engineVersion: ENGINE_VERSION
  };
  write(K_SESSION, session);
  return session;
}

export function saveSession(session: AssessmentSession) {
  write(K_SESSION, session);
}

export function clearActiveSession() {
  try {
    localStorage.removeItem(K_SESSION);
  } catch {
    /* noop */
  }
}

/** 세션의 questionIds를 실제 문항 객체로 복원 (추출 순서 그대로) */
export function questionsOf(session: AssessmentSession): Question[] {
  return session.questionIds.map(id => {
    const q = QUESTION_BY_ID.get(id);
    if (!q) throw new Error(`세션 복원 실패: 문항 ${id} 를 문항은행에서 찾을 수 없습니다.`);
    return q;
  });
}

/** 응답 완료 → 채점, 유형 매칭, 결과 저장, 세션 종료 (길이와 무관하게 동일) */
export function completeSession(session: AssessmentSession): StoredAssessmentResult {
  const items = questionsOf(session);
  const result = scoreAssessment(items, session.answers) as ScoreResult;
  const matched = matchType(result.code);

  const stored: StoredAssessmentResult = {
    sessionId: session.sessionId,
    completedAt: new Date().toISOString(),
    questionIds: session.questionIds,
    answers: session.answers,
    code: result.code,
    preferredEnergies: result.preferredEnergies,
    energyScores: result.energyScores,
    axisResults: result.axisResults,
    typePersonaName: matched.personaName,
    assessmentLength: session.assessmentLength,
    bankVersion: session.bankVersion,
    questionBankVersion: QUESTION_BANK_VERSION,
    engineVersion: session.engineVersion,
    typeDatasetVersion: TYPE_DATASET_VERSION
  };

  const all = read<StoredAssessmentResult[]>(K_RESULTS) ?? [];
  all.push(stored);
  write(K_RESULTS, all);
  pushRecentQuestionIds(session.questionIds);
  clearActiveSession();
  return stored;
}

export function getResults(): StoredAssessmentResult[] {
  return read<StoredAssessmentResult[]>(K_RESULTS) ?? [];
}

export function getResult(sessionId: string): StoredAssessmentResult | null {
  return getResults().find(r => r.sessionId === sessionId) ?? null;
}

export function getLatestResult(): StoredAssessmentResult | null {
  const all = getResults();
  return all.length ? all[all.length - 1] : null;
}

export function deleteResult(sessionId: string) {
  write(K_RESULTS, getResults().filter(r => r.sessionId !== sessionId));
}

/** '내 결과 삭제' — 로컬에 저장된 모든 마이코어12 데이터를 지운다 (legacy key 포함) */
export function deleteAllLocalData() {
  try {
    for (const key of ALL_KNOWN_KEYS) {
      if (key === K_DATA_VERSION) continue; // 버전 지문은 유지해 불필요한 초기화를 막는다
      localStorage.removeItem(key);
    }
  } catch {
    /* noop */
  }
}
