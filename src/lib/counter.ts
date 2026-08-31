/**
 * 방문자 수 / 검사 완료 건수 카운터.
 *
 * 정적 사이트라 서버가 없다. "모두에게 같은 숫자"를 보여주는 진짜 전체
 * 카운트를 만들려면 외부 서비스가 반드시 필요하다. 처음엔 가입 없이 바로
 * 쓸 수 있는 무료 서비스를 썼지만, 개인이 운영하는 작은 서비스라 오래
 * 유지된다는 보장이 없어 2026-08-31 에 직접 소유한 Cloudflare Worker로
 * 옮겼다 — Worker 코드는 `cloudflare-worker/counter-worker.js` 에 그대로
 * 있고, 이 파일은 그 Worker 를 호출만 한다.
 *
 * Cloudflare 도 100% 무중단을 보장하진 않지만, 개인 취미 서비스보다는
 * 훨씬 안정적으로 오래 유지될 가능성이 높다. 그래도 모든 호출은 실패해도
 * 앱 동작에 전혀 영향을 주지 않도록 try/catch 로 감싸고, 실패 시 조용히
 * null 을 돌려준다 — 화면에는 그냥 숫자가 보이지 않을 뿐이다.
 */

/** 우리 소유의 Cloudflare Worker 주소 — 다른 사이트와 공유하지 않는 전용 카운터다 */
const BASE = "https://mycore12-counter.mnl-laboratoire.workers.dev";

/** 전용 KV 저장소라 도메인 접두어 없이 짧은 key 를 쓴다 */
const VISIT_KEY = "site_visits";
const COMPLETION_KEY = "assessment_completions";

/** 같은 브라우저 세션(탭을 새로 열기 전까지)에서 방문 카운트를 한 번만 올린다 */
const VISIT_SESSION_FLAG = "mycore12.visitCounted.v1";

interface CountResponse {
  value: string | number;
}

async function callApi(path: string): Promise<number | null> {
  try {
    const res = await fetch(`${BASE}/${path}`);
    if (!res.ok) return null;
    const data = (await res.json()) as CountResponse;
    const n = Number(data.value);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null; // 네트워크 실패·서비스 중단 등 — 조용히 무시한다
  }
}

/**
 * 이번 브라우저 세션에서 아직 방문을 세지 않았다면 방문자 카운터를 1 올린다.
 * 앱이 처음 켜질 때 한 번만 호출하면 된다(세션당 중복 집계 방지).
 */
export function countVisitOnce(): void {
  try {
    if (sessionStorage.getItem(VISIT_SESSION_FLAG)) return;
    sessionStorage.setItem(VISIT_SESSION_FLAG, "1");
  } catch {
    /* sessionStorage 를 못 쓰는 환경이면 그냥 매번 셀 수 있게 둔다 */
  }
  void callApi(`hit/${VISIT_KEY}`);
}

/** 검사를 실제로 완료했을 때 한 번 호출한다(재조회·재방문에서는 부르지 않는다) */
export function countAssessmentCompletion(): void {
  void callApi(`hit/${COMPLETION_KEY}`);
}

/** 현재 값을 증가 없이 읽어온다 — 화면 표시용 */
export async function getCounts(): Promise<{
  visits: number | null;
  completions: number | null;
}> {
  const [visits, completions] = await Promise.all([
    callApi(`get/${VISIT_KEY}`),
    callApi(`get/${COMPLETION_KEY}`)
  ]);
  return { visits, completions };
}
