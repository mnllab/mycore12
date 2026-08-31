/**
 * MYCORE12 방문자/검사 완료 카운터 — Cloudflare Worker.
 *
 * 이 파일은 GitHub 저장소(정적 사이트)에는 배포되지 않는다. Cloudflare
 * 대시보드의 Worker 편집기에 그대로 붙여넣어 별도로 배포하는 코드다.
 * 설정 방법은 이 폴더의 README.md 참고.
 *
 * 기존에 쓰던 countapi.mileshilliard.com 과 완전히 같은 응답 모양
 * ( GET /hit/:key → 값을 1 올리고 반환, GET /get/:key → 값만 조회 )
 * 을 그대로 맞춰서, 앱(src/lib/counter.ts) 쪽은 주소(BASE) 한 줄만
 * 바꾸면 되고 다른 코드는 손댈 필요가 없다.
 *
 * 주의할 점 (KV 저장소의 한계)
 *   Cloudflare KV 는 "많이 읽고 가끔 쓰는" 용도에 최적화되어 있어서,
 *   아주 짧은 순간(1초 이내)에 같은 key 로 요청이 여러 번 동시에 들어오면
 *   드물게 카운트가 한두 개 씩 덜 올라갈 수 있다(정확한 은행 잔고 같은
 *   용도에는 안 맞음). 방문자 수를 대략적으로 보여주는 용도로는 문제없는
 *   수준이라 이 방식을 쓴다. 완벽하게 정확한 카운트가 필요해지면 나중에
 *   Durable Objects 로 바꿀 수 있다(현재는 배포 방법이 더 복잡해서 보류).
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 브라우저의 CORS 사전 확인(OPTIONS) 요청에 응답한다
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const parts = url.pathname.split("/").filter(Boolean); // "/hit/key" → ["hit", "key"]
    const [action, key] = parts;

    if (parts.length !== 2 || (action !== "hit" && action !== "get")) {
      return json({ error: "Not found" }, 404);
    }
    if (!key || key.length > 200) {
      return json({ error: "Invalid key" }, 400);
    }

    const current = Number(await env.COUNTER_KV.get(key)) || 0;
    const value = action === "hit" ? current + 1 : current;

    if (action === "hit") {
      await env.COUNTER_KV.put(key, String(value));
    }

    return json({ key, value });
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() }
  });
}

function corsHeaders() {
  return {
    // 방문자 수는 민감하지 않은 공개 정보라 모든 출처를 허용한다
    // (필요하면 나중에 "https://mycore12.com" 처럼 특정 도메인으로 좁힐 수 있다)
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
