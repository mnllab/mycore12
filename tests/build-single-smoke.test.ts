/**
 * build:single 산출물 스모크 테스트.
 *
 * 배경 (2026-08-30 발견)
 *   `scripts/build-single.mjs` 가 `.replace(search, replacementString)` 형태로
 *   CSS/JS 를 index.html 에 주입했다. JS 의 `String.prototype.replace` 는
 *   replacementString 이 **문자열**일 때 그 안의 `$&`(일치한 부분 문자열),
 *   `$1`, `$'` 같은 특수 패턴을 해석한다. React 자체의 번들 코드 안에
 *   `$&` 시퀀스가 들어 있어서(예: key escape 로직의 `"$&/"` 리터럴, 압축된
 *   변수명 `$` 바로 뒤에 `&&` 연산자가 오는 경우), 주입 과정에서 `$&` 가
 *   검색어("</body>" 등)로 치환되며 번들이 조용히 깨졌다. 그 결과
 *   `build:single` 산출물이 SyntaxError 로 전혀 실행되지 않는 상태로
 *   배포되고 있었다.
 *
 *   기존 400여 개 테스트는 전부 Vite 의 dev transform 을 통해 **소스**를
 *   렌더링했고, 실제 `dist-single/index.html` 을 JS 엔진으로 실행해보는
 *   테스트가 하나도 없어 이 버그를 잡지 못했다. 이 파일이 그 공백을 메운다.
 *
 * 이 테스트는 `npm run build:single` 을 먼저 실행해 `dist-single/` 이
 * 생성되어 있어야 의미가 있다. 산출물이 없으면(단독으로 `npm test` 만
 * 돌린 경우) 건너뛴다 — CI/배포 파이프라인에서는 build:single 이후에
 * `npm test` 를 다시 실행해 이 파일이 반드시 실행되게 한다.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const OUT = join(__dirname, "../dist-single");
const built = existsSync(join(OUT, "index.html"));

describe.runIf(built)("build:single 산출물 — 실제 실행 스모크 테스트", () => {
  const html = readFileSync(join(OUT, "index.html"), "utf8");

  it("index.html 안에 </body> 가 실제 닫는 태그 한 번만 있다 (주입 치환 오염 검출)", () => {
    // $&, $1, $' 같은 JS replace 특수 패턴이 남긴 흔적이 없는지도 함께 확인한다.
    const bodyCloses = html.match(/<\/body>/g) ?? [];
    expect(bodyCloses.length, "</body> 개수").toBe(1);
    const headCloses = html.match(/<\/head>/g) ?? [];
    expect(headCloses.length, "</head> 개수").toBe(1);
  });

  it("빌드 스크립트는 replacer 함수를 쓴다 (문자열 치환 특수 패턴 금지)", () => {
    const script = readFileSync(
      join(__dirname, "../scripts/build-single.mjs"),
      "utf8"
    );
    // .replace("</head>", `...`) 처럼 두 번째 인자가 문자열/템플릿 리터럴이면
    // 위험하다. 반드시 () => `...` 형태의 함수여야 한다.
    expect(script).toMatch(/\.replace\("<\/head>",\s*\(\)\s*=>/);
    expect(script).toMatch(/\.replace\("<\/body>",\s*\(\)\s*=>/);
  });

  it("실제 JS 엔진(jsdom)으로 로드했을 때 SyntaxError 없이 홈 화면이 그려진다", async () => {
    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      resources: "usable",
      url: "https://mycore12.com/",
      pretendToBeVisual: true
    });
    const { window } = dom;
    window.scrollTo = () => {};
    const errors: string[] = [];
    window.addEventListener("error", e =>
      errors.push(e.error?.message ?? e.message)
    );

    await new Promise(r => setTimeout(r, 1500));

    expect(errors, errors.join(" | ")).toEqual([]);
    expect(dom.window.document.querySelector(".length-card")).not.toBeNull();
    dom.window.close();
  }, 15000);

  it("검사 → 결과 → 처음으로 전체 흐름이 오류 없이 끝까지 실행된다", async () => {
    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      resources: "usable",
      url: "https://mycore12.com/",
      pretendToBeVisual: true
    });
    const { window } = dom;
    window.scrollTo = () => {};
    const errors: string[] = [];
    window.addEventListener("error", e =>
      errors.push(e.error?.message ?? e.message)
    );
    const click = (el: Element | null | undefined) =>
      el?.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    const d = window.document;

    await wait(1500);
    click([...d.querySelectorAll(".length-card")].find(c => c.textContent?.includes("18문항")));
    await wait(100);
    click([...d.querySelectorAll("button")].find(b => b.textContent?.trim() === "검사 시작"));
    await wait(600);

    for (let n = 0; n < 25; n++) {
      const radios = [...d.querySelectorAll('button[role="radio"]')];
      if (!radios.length) break;
      click(radios[0]);
      await wait(220);
    }
    await wait(2000);

    const heading = d.querySelector(".result-hero h1")?.textContent;
    expect(heading, "결과 화면 진입").toBeTruthy();

    const backBtn = [...d.querySelectorAll(".result-actions a")].find(
      a => a.textContent?.trim() === "처음으로"
    );
    expect(backBtn, "처음으로 버튼 존재").toBeTruthy();
    expect(
      [...d.querySelectorAll(".result-actions a, .result-actions button")].some(
        b => b.textContent?.trim() === "다시 검사하기"
      ),
      "다시 검사하기 버튼이 없어야 한다"
    ).toBe(false);

    click(backBtn);
    await wait(500);
    expect(d.querySelectorAll(".length-card")).toHaveLength(4);

    expect(errors, errors.join(" | ")).toEqual([]);
    dom.window.close();
  }, 20000);

  it("주요 라우트가 모두 오류 없이 렌더된다 (about/energies/how/guide/stories/changelog)", async () => {
    const routes = [
      "#/about",
      "#/energies",
      "#/how",
      "#/guide",
      "#/stories",
      "#/stories/strengths-already-here",
      "#/changelog",
      "#/history",
      "#/privacy"
    ];
    for (const hash of routes) {
      const dom = new JSDOM(html, {
        runScripts: "dangerously",
        resources: "usable",
        url: `https://mycore12.com/${hash}`,
        pretendToBeVisual: true
      });
      const { window } = dom;
      window.scrollTo = () => {};
      const errors: string[] = [];
      window.addEventListener("error", e =>
        errors.push(e.error?.message ?? e.message)
      );
      await new Promise(r => setTimeout(r, 1200));
      expect(errors, `${hash}: ${errors.join(" | ")}`).toEqual([]);
      expect(dom.window.document.querySelector("h1"), hash).not.toBeNull();
      dom.window.close();
    }
  }, 30000);
});
