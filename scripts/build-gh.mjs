/**
 * GitHub Pages 배포용 빌드.
 *
 * GitHub Pages 는 저장소 이름이 URL 하위 경로가 되므로(예: /mycore12/)
 * 에셋 경로를 그 base 에 맞춰 빌드해야 한다. 루트가 아닌 곳에 배포하면서
 * base 를 지정하지 않으면 /assets/... 를 찾다가 404가 나고 화면이 비어 보인다.
 *
 * 또한 GitHub Pages 는 _redirects/.htaccess 를 지원하지 않으므로,
 * SPA 딥링크(/result/:id) 새로고침 대비로 index.html 을 404.html 로 복사한다.
 *
 * 사용법:
 *   npm run build:gh                 → base "/mycore12/"
 *   REPO=다른이름 npm run build:gh    → base "/다른이름/"
 */
import { execSync } from "node:child_process";
import { copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repo = process.env.REPO ?? "mycore12";
const base = `/${repo.replace(/^\/|\/$/g, "")}/`;

console.log(`[build:gh] base = ${base}`);
execSync("npm run build", {
  stdio: "inherit",
  env: { ...process.env, VITE_BASE: base }
});

// SPA 딥링크 fallback
copyFileSync(join("dist", "index.html"), join("dist", "404.html"));
// Jekyll 처리 비활성화 (_ 로 시작하는 파일이 무시되는 것을 방지)
writeFileSync(join("dist", ".nojekyll"), "");

console.log("[build:gh] dist/404.html, dist/.nojekyll 생성 완료");
console.log("[build:gh] dist/ 폴더 내용을 gh-pages 브랜치(또는 docs/)에 배포하세요.");
