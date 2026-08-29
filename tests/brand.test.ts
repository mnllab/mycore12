/**
 * 브랜드 마이그레이션 검수 (CORE12 → 마이코어12 / MYCORE12).
 * 기능·데이터가 아니라 브랜드 표기와 저장 key 이전만 검증한다.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k)
  }
});

const storage = await import("../src/lib/storage");
const { BRAND } = await import("../src/lib/mycore12");

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("브랜드 상수", () => {
  it("공식 표기가 한 곳에서 정의된다", () => {
    expect(BRAND.nameKo).toBe("마이코어12");
    expect(BRAND.nameEn).toBe("MYCORE12");
    expect(BRAND.slug).toBe("mycore12");
    expect(BRAND.lockup).toBe("마이코어12 · MYCORE12");
    expect(BRAND.tagline).toBe("나를 이루는 12가지 에너지");
    expect(BRAND.descriptor).toBe("6축 기반 성향 프로파일");
    expect(BRAND.copyright).toBe("© Janggil Kim. All Rights Reserved.");
    expect(BRAND.copyrightKo).toBe("저작권자의 허락 없이 무단 복제 및 재배포를 금지합니다.");
  });

  it("비공식 영문 표기를 사용하지 않는다", () => {
    const collect = (dir: string): string[] =>
      readdirSync(join(ROOT, dir)).flatMap(n => {
        const rel = `${dir}/${n}`;
        return statSync(join(ROOT, rel)).isDirectory()
          ? collect(rel)
          : /\.(tsx?|css|html|json|md)$/.test(n)
          ? [rel]
          : [];
      });
    const files = [
      ...collect("src/lib"),
      ...collect("src/pages"),
      ...collect("src/components"),
      "src/styles/global.css",
      "index.html",
      "public/manifest.webmanifest",
      "README.md",
      "package.json"
    ];
    const forbidden = ["MyCore12", "Mycore12", "My Core 12", "MY CORE 12", "MYCORE 12"];
    for (const f of files) {
      // 문서에서 "사용하지 않는 표기"를 나열한 블록은 검사 대상에서 제외한다
      const text = read(f).replace(
        /<!-- deprecated-brand-list:start -->[\s\S]*?<!-- deprecated-brand-list:end -->/g,
        ""
      );
      for (const bad of forbidden) expect(text.includes(bad), `${f}: ${bad}`).toBe(false);
    }
  });

  it("앱 소스에 기존 브랜드가 남아 있지 않다 (정리 대상 key 정의 제외)", () => {
    const collect = (dir: string): string[] =>
      readdirSync(join(ROOT, dir)).flatMap(n => {
        const rel = `${dir}/${n}`;
        return statSync(join(ROOT, rel)).isDirectory()
          ? collect(rel)
          : /\.(tsx?|css)$/.test(n)
          ? [rel]
          : [];
      });
    for (const f of [...collect("src/pages"), ...collect("src/components"), "src/styles/global.css"]) {
      const text = read(f).replace(/MYCORE12/g, "").replace(/mycore12/g, "");
      expect(/CORE12|Core12|core12|CORE 12/.test(text), f).toBe(false);
    }
    // storage.ts 의 기존 표기는 legacy key 정의와 그 설명에만 존재해야 한다
    const storageSrc = read("src/lib/storage.ts");
    for (const line of storageSrc.split("\n")) {
      if (!/core12/i.test(line)) continue;
      if (/MYCORE12|mycore12/.test(line)) continue;
      expect(/정리 대상|구 브랜드|legacy/i.test(line), `용도 표시 없음: ${line.trim()}`).toBe(true);
    }
  });
});

describe("로컬 데이터 초기화 (테스트 단계 정책)", () => {
  beforeEach(() => store.clear());

  it("신규 저장은 항상 mycore12 key를 사용한다", () => {
    storage.resetStaleLocalData();
    const s = storage.startNewSession();
    for (const q of storage.questionsOf(s)) s.answers[q.id] = 3;
    storage.completeSession(s);
    expect([...store.keys()].every(k => k.startsWith("mycore12."))).toBe(true);
  });

  it("첫 실행이면 버전 지문을 기록한다", () => {
    const r = storage.resetStaleLocalData();
    expect(r.reset).toBe(true);
    expect(r.from).toBeNull();
    expect(store.get("mycore12.dataVersion")).toContain("3.2.1-blind-review");
  });

  it("같은 버전에서는 데이터를 건드리지 않는다", () => {
    storage.resetStaleLocalData();
    const s = storage.startNewSession();
    for (const q of storage.questionsOf(s)) s.answers[q.id] = 2;
    const result = storage.completeSession(s);
    const before = new Map(store);

    const r = storage.resetStaleLocalData();

    expect(r.reset).toBe(false);
    expect([...store.entries()]).toEqual([...before.entries()]);
    expect(storage.getResult(result.sessionId)!.code).toBe(result.code);
  });

  it("데이터 버전이 바뀌면 세션·이력만 정리하고 완료 결과는 보존한다", () => {
    storage.resetStaleLocalData();
    const s = storage.startNewSession();
    for (const q of storage.questionsOf(s)) s.answers[q.id] = 5;
    storage.completeSession(s);
    expect(storage.getResults()).toHaveLength(1);

    // 이전 빌드에서 저장된 상태를 재현
    store.set("mycore12.dataVersion", "3.1-operational-final|FINAL_v3.1|2.1");

    const r = storage.resetStaleLocalData();

    expect(r.reset).toBe(true);
    expect(r.from).toBe("3.1-operational-final|FINAL_v3.1|2.1");
    // 완료 결과는 자기 버전을 가진 독립 스냅숏이므로 보존한다
    expect(storage.getResults()).toHaveLength(1);
    expect(storage.getActiveSession()).toBeNull();
    expect(storage.getRecentQuestionIds()).toEqual([]);
    // 초기화 후 바로 정상 동작한다
    expect(storage.startNewSession().questionIds).toHaveLength(36);
  });

  it("구 브랜드 시절 잔여 key도 함께 정리한다 (값을 옮기지 않는다)", () => {
    store.set("core12.results.v1", JSON.stringify([{ sessionId: "old" }]));
    store.set("core12.activeSession.v1", "{}");
    store.set("core12.recentQuestionIds.v1", "[]");

    storage.resetStaleLocalData();

    expect(store.has("core12.results.v1")).toBe(false);
    expect(store.has("core12.activeSession.v1")).toBe(false);
    expect(store.has("core12.recentQuestionIds.v1")).toBe(false);
    expect(storage.getResults()).toEqual([]);
  });

  it("내 결과 삭제는 검사 데이터만 지우고 버전 지문은 남긴다", () => {
    storage.resetStaleLocalData();
    const s = storage.startNewSession();
    for (const q of storage.questionsOf(s)) s.answers[q.id] = 3;
    storage.completeSession(s);

    storage.deleteAllLocalData();

    expect(storage.getResults()).toEqual([]);
    expect(storage.getActiveSession()).toBeNull();
    expect(storage.getRecentQuestionIds()).toEqual([]);
    // 지문이 남아 있어 다음 실행에서 불필요한 초기화가 일어나지 않는다
    expect(store.has("mycore12.dataVersion")).toBe(true);
    expect(storage.resetStaleLocalData().reset).toBe(false);
  });
});

describe("참조 패키지 문서", () => {
  const PKG = join(ROOT, "../MYCORE12_CLAUDE_WEBAPP_FINAL_package");
  const exists = (() => {
    try {
      statSync(PKG);
      return true;
    } catch {
      return false;
    }
  })();

  it.runIf(exists)("PACKAGE_MANIFEST의 파일 경로와 SHA256이 실제 파일과 일치한다", () => {
    const { createHash } = require("node:crypto");
    const manifest = JSON.parse(
      readFileSync(join(PKG, "PACKAGE_MANIFEST.json"), "utf8")
    );
    for (const f of manifest.files) {
      const p = join(PKG, f.path);
      expect(() => statSync(p), f.path).not.toThrow();
      const sha = createHash("sha256").update(readFileSync(p)).digest("hex");
      expect(sha, f.path).toBe(f.sha256);
      expect(/MYMYCORE|(^|[^Y])CORE12_/.test(f.path), f.path).toBe(false);
    }
    expect(manifest.brand.brandNameKo).toBe("마이코어12");
    expect(manifest.brand.brandNameEn).toBe("MYCORE12");
    expect(manifest.brand.slug).toBe("mycore12");
  });

  it.runIf(exists)("기준 문서에 구 브랜드가 남지 않는다 (진단 데이터·금지목록 제외)", () => {
    const docs = readdirSync(PKG).filter(n => n.endsWith(".md"));
    expect(docs.length).toBeGreaterThan(4);
    for (const d of docs) {
      // 공식 표기(MYCORE12 / mycore12)는 제거한 뒤 구 브랜드만 검사한다
      const text = readFileSync(join(PKG, d), "utf8")
        .replace(/MYCORE12/g, "")
        .replace(/mycore12/g, "")
        .replace(
          /<!-- deprecated-brand-list:start -->[\s\S]*?<!-- deprecated-brand-list:end -->/g,
          ""
        );
      expect(/CORE12|Core12|core12/.test(text), d).toBe(false);
    }
  });
});
