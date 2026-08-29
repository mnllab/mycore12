/**
 * GitHub Pages 배포용 빌드.
 *
 * GitHub Pages 의 제약과 대응:
 *
 * 1) 저장소 이름이 URL 하위 경로가 된다 (https://<계정>.github.io/<저장소>/).
 *    → base 를 "/<저장소>/" **절대경로**로 고정한다.
 *
 *    상대경로("./")를 쓰면 진입 URL 에 따라 에셋 위치가 달라져 흰 화면이 된다.
 *      /mycore12/            → /mycore12/assets/...   (정상)
 *      /mycore12             → /assets/...            (404, 흰 화면)
 *      /mycore12/result/abc  → /mycore12/result/...   (404, 흰 화면)
 *    절대경로는 어느 깊이에서 들어와도 항상 같은 곳을 가리킨다.
 *
 * 2) _redirects / .htaccess 같은 SPA rewrite 설정을 지원하지 않는다.
 *    → HashRouter 로 빌드해 /mycore12/#/result/… 형태로 라우팅한다.
 *
 * 3) 예전 주소(/mycore12/how 등)로 들어오는 경우가 남아 있다.
 *    → 404.html 을 index.html 복사본이 아니라 **base 로 보내는 리다이렉트 페이지**로
 *      만든다. 복사본이면 깊은 경로에서 에셋을 못 찾아 또 흰 화면이 된다.
 *
 * 사용법:
 *   npm run build:gh                 → base "/mycore12/"
 *   REPO=저장소이름 npm run build:gh  → base "/저장소이름/"
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const repo = (process.env.REPO ?? "mycore12").replace(/^\/|\/$/g, "");
const base = `/${repo}/`;

console.log(`[build:gh] base = ${base} (절대경로), router = hash`);

execSync("npm run build", {
  stdio: "inherit",
  env: { ...process.env, VITE_BASE: base, VITE_ROUTER: "hash" }
});

// 404 fallback: 어떤 깊은 경로로 들어와도 base 로 되돌린다 (에셋 경로 문제 없음)
writeFileSync(
  join("dist", "404.html"),
  `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>마이코어12 MYCORE12</title>
    <script>
      // 예전 주소나 없는 경로로 들어온 경우 홈으로 보낸다.
      (function () {
        var base = ${JSON.stringify(base)};
        var rest = location.pathname.slice(base.length);
        var hash = location.hash && location.hash !== "#" ? location.hash : (rest ? "#/" + rest : "");
        location.replace(base + hash);
      })();
    </script>
  </head>
  <body></body>
</html>
`
);
writeFileSync(join("dist", ".nojekyll"), "");

console.log("[build:gh] dist/404.html(리다이렉트), dist/.nojekyll 생성 완료");
console.log("[build:gh] dist/ 폴더의 '내용물'을 Pages 소스에 올리세요 (dist 폴더 자체가 아니라).");
