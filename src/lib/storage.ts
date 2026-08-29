/**
 * 로컬 저장 레이어 (localStorage) — 마이코어12(MYCORE12).
 * - 진행 중 세션: 새로고침 시 동일 36문항과 답변을 복원
 * - 최근 문항 ID: 재검사 시 recentlySeenIds로 전달 (최근 3회)
 * - 결과 기록: 유형·점수·버전 저장, 삭제 기능 제공
 */
import { drawAssessment, scoreAssessment } from "../vendor/positive_assessment_engine_FINAL_v3.1.js";
import { spreadByAxis } from "./ordering";
import {
  BANK_VERSION,
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
 * LEGACY ONLY — 브랜드 변경(구 CORE12 → 마이코어12 / MYCORE12) 이전 버전이
 * 사용하던 localStorage key다. 오직 과거 사용자 데이터 이전(migration)에만
 * 쓰이며, 신규 저장에는 절대 사용하지 않는다. 이전이 끝나면 삭제된다.
 */
const LEGACY_CORE12_SESSION_KEY = "core12.activeSession.v1";
const LEGACY_CORE12_RECENT_KEY = "core12.recentQuestionIds.v1";
const LEGACY_CORE12_RESULTS_KEY = "core12.results.v1";

/** legacy key → 신규 key 대응표 (migration 전용) */
const LEGACY_KEY_MAP: Record<string, string> = {
  [LEGACY_CORE12_SESSION_KEY]: K_SESSION,
  [LEGACY_CORE12_RECENT_KEY]: K_RECENT,
  [LEGACY_CORE12_RESULTS_KEY]: K_RESULTS
};

export interface AssessmentSession {
  sessionId: string;
  startedAt: string;
  questionIds: string[];
  answers: Record<string, 1 | 2 | 3 | 4 | 5>;
  currentIndex: number;
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
  bankVersion: string;
  engineVersion: string;
  typeDatasetVersion: string;
}

/**
 * 앱 시작 시 1회 실행. 기존 core12.* key가 있고 신규 mycore12.* key가 없으면
 * 저장된 값을 그대로(응답·점수·유형코드 변형 없이) 신규 key로 옮긴다.
 * 이미 신규 key가 있으면 덮어쓰지 않는다.
 */
export function migrateLegacyStorage(): { migrated: string[]; skipped: string[] } {
  const migrated: string[] = [];
  const skipped: string[] = [];
  for (const [legacyKey, nextKey] of Object.entries(LEGACY_KEY_MAP)) {
    let legacyValue: string | null = null;
    try {
      legacyValue = localStorage.getItem(legacyKey);
    } catch {
      continue;
    }
    if (legacyValue === null) continue;

    try {
      if (localStorage.getItem(nextKey) === null) {
        localStorage.setItem(nextKey, legacyValue); // 값은 그대로 이전한다
        migrated.push(legacyKey);
      } else {
        skipped.push(legacyKey);
      }
      localStorage.removeItem(legacyKey);
    } catch {
      /* 저장 불가 환경에서도 앱은 계속 동작한다 */
    }
  }
  return { migrated, skipped };
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
  if (!s || !Array.isArray(s.questionIds) || s.questionIds.length !== 36) return null;
  // 은행 버전이 바뀐 세션은 복원하지 않는다
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
    s.currentIndex > 35
  ) {
    return { ...s, currentIndex: 0 };
  }
  return s;
}

/** 검사를 새로 시작할 때만 호출 — drawAssessment()로 새 36문항 추출 */
export function startNewSession(): AssessmentSession {
  const draw = drawAssessment as (opts?: {
    recentlySeenIds?: string[];
    rng?: () => number;
  }) => Question[];
  // 엔진이 뽑은 36문항을 그대로 사용하되, 표시 순서만 축이 연속되지 않게 보정한다
  const items = spreadByAxis(draw({ recentlySeenIds: getRecentQuestionIds() }));
  const session: AssessmentSession = {
    sessionId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    startedAt: new Date().toISOString(),
    questionIds: items.map(q => q.id),
    answers: {},
    currentIndex: 0,
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

/** 36문항 응답 완료 → 채점, 유형 매칭, 결과 저장, 세션 종료 */
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
    bankVersion: session.bankVersion,
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
    localStorage.removeItem(K_SESSION);
    localStorage.removeItem(K_RECENT);
    localStorage.removeItem(K_RESULTS);
    // 이전되지 않은 legacy 데이터도 함께 삭제한다
    for (const legacyKey of Object.keys(LEGACY_KEY_MAP)) localStorage.removeItem(legacyKey);
  } catch {
    /* noop */
  }
}
