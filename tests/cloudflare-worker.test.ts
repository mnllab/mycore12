/**
 * cloudflare-worker/counter-worker.js 검증.
 *
 * 이 스크립트는 GitHub Pages 로 배포되는 앱 소스가 아니라 Cloudflare
 * 대시보드에 별도로 붙여넣는 코드지만, 저장소에 함께 보관하고 있으므로
 * 로직이 깨지지 않았는지 모의(mock) KV 로 확인해둔다.
 *
 * src/lib/counter.ts 가 만드는 요청 경로(hit/get + key)와 정확히 같은
 * 모양으로 응답하는지가 핵심이다 — 나중에 주소만 바꿔서 실제 배포로
 * 전환했을 때 앱 코드를 추가로 고칠 필요가 없어야 한다.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const WORKER_PATH = join(__dirname, "../cloudflare-worker/counter-worker.js");

function createMockKv() {
  const store = new Map<string, string>();
  return {
    store,
    kv: {
      get: async (k: string) => store.get(k) ?? null,
      put: async (k: string, v: string) => {
        store.set(k, v);
      }
    }
  };
}

async function loadWorker() {
  const mod = await import(WORKER_PATH);
  return mod.default as {
    fetch: (req: Request, env: { COUNTER_KV: unknown }) => Promise<Response>;
  };
}

describe("Cloudflare Worker 카운터 스크립트", () => {
  it("문법적으로 유효한 ES 모듈이고 default export 에 fetch 가 있다", async () => {
    const worker = await loadWorker();
    expect(typeof worker.fetch).toBe("function");
  });

  it("/hit/:key 는 값을 1씩 올린다", async () => {
    const worker = await loadWorker();
    const { kv } = createMockKv();
    const call = (path: string) =>
      worker.fetch(new Request(`https://example.workers.dev${path}`), {
        COUNTER_KV: kv
      });

    const r1 = await (await call("/hit/site_visits")).json();
    const r2 = await (await call("/hit/site_visits")).json();
    expect(r1.value).toBe(1);
    expect(r2.value).toBe(2);
  });

  it("/get/:key 는 값을 올리지 않고 조회만 한다", async () => {
    const worker = await loadWorker();
    const { kv } = createMockKv();
    const call = (path: string) =>
      worker.fetch(new Request(`https://example.workers.dev${path}`), {
        COUNTER_KV: kv
      });

    await call("/hit/assessment_completions");
    await call("/hit/assessment_completions");
    const g1 = await (await call("/get/assessment_completions")).json();
    const g2 = await (await call("/get/assessment_completions")).json();
    expect(g1.value).toBe(2);
    expect(g2.value).toBe(2); // get 을 반복해도 값이 그대로다
  });

  it("두 카운터(방문자/검사 완료)는 서로 독립적이다", async () => {
    const worker = await loadWorker();
    const { kv } = createMockKv();
    const call = (path: string) =>
      worker.fetch(new Request(`https://example.workers.dev${path}`), {
        COUNTER_KV: kv
      });

    await call("/hit/site_visits");
    await call("/hit/site_visits");
    await call("/hit/assessment_completions");

    const visits = await (await call("/get/site_visits")).json();
    const completions = await (
      await call("/get/assessment_completions")
    ).json();
    expect(visits.value).toBe(2);
    expect(completions.value).toBe(1);
  });

  it("잘못된 경로와 빈 key 는 404 로 안전하게 처리된다", async () => {
    const worker = await loadWorker();
    const { kv } = createMockKv();
    const call = (path: string) =>
      worker.fetch(new Request(`https://example.workers.dev${path}`), {
        COUNTER_KV: kv
      });

    expect((await call("/nope")).status).toBe(404);
    expect((await call("/hit/")).status).toBe(404);
    expect((await call("/hit/a/b")).status).toBe(404);
  });

  it("모든 응답에 CORS 헤더가 있어 브라우저에서 바로 호출할 수 있다", async () => {
    const worker = await loadWorker();
    const { kv } = createMockKv();
    const res = await worker.fetch(
      new Request("https://example.workers.dev/get/site_visits"),
      { COUNTER_KV: kv }
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("OPTIONS 사전 확인 요청에도 CORS 헤더로 응답한다", async () => {
    const worker = await loadWorker();
    const { kv } = createMockKv();
    const res = await worker.fetch(
      new Request("https://example.workers.dev/hit/x", { method: "OPTIONS" }),
      { COUNTER_KV: kv }
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("src/lib/counter.ts 의 key 형식과 정확히 같은 key 로 조회 가능하다", () => {
    const counterSrc = readFileSync(
      join(__dirname, "../src/lib/counter.ts"),
      "utf8"
    );
    expect(counterSrc).toContain("site_visits");
    expect(counterSrc).toContain("assessment_completions");
  });

  it("설정 가이드(README)가 저장소에 함께 보관되어 있다", () => {
    const readme = readFileSync(
      join(__dirname, "../cloudflare-worker/README.md"),
      "utf8"
    );
    expect(readme).toContain("COUNTER_KV");
    expect(readme.length).toBeGreaterThan(200);
  });
});
