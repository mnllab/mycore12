/**
 * 단일 파일 빌드 (배포 경로 문제 원천 차단).
 *
 * 왜 필요한가
 *   GitHub Pages 는 저장소 이름이 URL 하위 경로가 되고, 업로드 방식에 따라
 *   파일 위치가 한 단계 달라지기 쉽다. 외부 에셋(js/css/svg)을 참조하는 순간
 *   경로가 어긋나 흰 화면이 난다.
 *
 * 무엇을 하는가
 *   JS · CSS · 아이콘 · manifest 를 전부 index.html 안에 인라인해서
 *   **외부 요청이 0건인 단일 HTML 파일**을 만든다.
 *   - 어느 폴더에 올려도 동작한다 (루트, /mycore12/, 더 깊은 경로 모두)
 *   - base 설정이 필요 없다
 *   - 파일을 더블클릭해 file:// 로 열어도 동작한다
 *   - IIFE 로 번들해 type="module" 제약도 없앤다
 *   - 라우팅은 HashRouter 라 서버 rewrite 설정이 필요 없다
 *
 * 사용법: npm run build:single  →  dist-single/index.html 하나만 올리면 끝
 */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "dist-single";

console.log("[build:single] 단일 파일 빌드 시작");
execSync("npm run build", {
  stdio: "inherit",
  env: { ...process.env, VITE_SINGLE: "1", VITE_ROUTER: "hash", VITE_BASE: "./" }
});

// 번들 JS/CSS 는 출력 루트나 assets/ 아래에 생길 수 있으므로 둘 다 훑는다
const assetsDir = join(OUT, "assets");
const candidates = [
  ...readdirSync(OUT).map(f => ({ dir: OUT, f })),
  ...(existsSync(assetsDir) ? readdirSync(assetsDir).map(f => ({ dir: assetsDir, f })) : [])
];
const jsEntry = candidates.find(c => c.f.endsWith(".js"));
const cssEntry = candidates.find(c => c.f.endsWith(".css"));
if (!jsEntry) throw new Error("번들 JS 를 찾지 못했습니다.");

const js = readFileSync(join(jsEntry.dir, jsEntry.f), "utf8");
const css = cssEntry ? readFileSync(join(cssEntry.dir, cssEntry.f), "utf8") : "";
const svg = readFileSync("public/brand-mark.svg", "utf8");
const iconDataUri = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;

let html = readFileSync(join(OUT, "index.html"), "utf8");

// 외부 참조를 전부 인라인으로 치환한다
html = html
  .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>\s*/g, "")
  .replace(/<link[^>]*rel="modulepreload"[^>]*>\s*/g, "")
  .replace(/<link[^>]*rel="stylesheet"[^>]*>\s*/g, "")
  .replace(/<link[^>]*rel="manifest"[^>]*>\s*/g, "")
  .replace(/(<link[^>]*rel="icon"[^>]*href=")[^"]*(")/, `$1${iconDataUri}$2`)
  .replace(/(content=")[^"]*brand-mark\.svg(")/g, `$1${iconDataUri}$2`);

html = html
  .replace("</head>", `    <style>${css}</style>\n  </head>`)
  .replace("</body>", `    <script>${js}</script>\n  </body>`);

writeFileSync(join(OUT, "index.html"), html);

// 404 도 같은 단일 파일 (자기완결형이라 어느 경로에서 떠도 정상 동작)
copyFileSync(join(OUT, "index.html"), join(OUT, "404.html"));
writeFileSync(join(OUT, ".nojekyll"), "");

// 인라인했으므로 남은 에셋 파일은 모두 제거 — index.html / 404.html / .nojekyll 만 남긴다
const KEEP = new Set(["index.html", "404.html", ".nojekyll"]);
for (const f of readdirSync(OUT)) {
  if (!KEEP.has(f)) rmSync(join(OUT, f), { recursive: true, force: true });
}

const remaining = readdirSync(OUT);
const size = (readFileSync(join(OUT, "index.html")).length / 1024).toFixed(0);

console.log(`[build:single] 완료 — index.html ${size} KB`);
console.log(`[build:single] 산출물: ${remaining.join(", ")}`);
console.log("[build:single] index.html 하나만 올려도 동작합니다 (경로 무관).");
