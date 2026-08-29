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

/** LEGACY ONLY — 구 브랜드 시절 key (migration 검증 전용) */
const LEGACY_CORE12_KEYS = {
  session: "core12.activeSession.v1",
  recent: "core12.recentQuestionIds.v1",
  results: "core12.results.v1"
};
const NEXT = {
  session: "mycore12.activeSession.v1",
  recent: "mycore12.recentQuestionIds.v1",
  results: "mycore12.results.v1"
};

describe("브랜드 상수", () => {
  it("공식 표기가 한 곳에서 정의된다", () => {
    expect(BRAND.nameKo).toBe("마이코어12");
    expect(BRAND.nameEn).toBe("MYCORE12");
    expect(BRAND.slug).toBe("mycore12");
    expect(BRAND.lockup).toBe("마이코어12 · MYCORE12");
    expect(BRAND.tagline).toBe("나를 이루는 12가지 에너지");
    expect(BRAND.descriptor).toBe("6축 기반 성향 프로파일");
    expect(BRAND.copyright).toBe("© Janggil Kim. All Rights Reserved.");
    expect(BRAND.copyrightKo).toBe("무단 복제 및 재배포를 금지합니다.");
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

  it("앱 소스에 기존 브랜드가 남아 있지 않다 (legacy migration 코드 제외)", () => {
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
      expect(/LEGACY|legacy|이전 버전|브랜드 변경/.test(line), `legacy 표시 없음: ${line.trim()}`).toBe(true);
    }
  });
});

describe("storage key 마이그레이션", () => {
  beforeEach(() => store.clear());

  it("기존 core12.* 데이터를 값 변형 없이 mycore12.* 로 이전한다", () => {
    const legacyResults = JSON.stringify([
      {
        sessionId: "legacy-1",
        completedAt: "2026-01-02T03:04:05.000Z",
        questionIds: ["AS-D01"],
        answers: { "AS-D01": 2 },
        code: "1-0-1-0-1-0",
        preferredEnergies: ["추진", "자율", "창의", "통합", "공감", "유연"],
        energyScores: { 추진: 68, 숙고: 32 },
        typePersonaName: "기존 결과",
        bankVersion: "3.1-operational-final",
        engineVersion: "FINAL_v3.1",
        typeDatasetVersion: "2.1"
      }
    ]);
    store.set(LEGACY_CORE12_KEYS.results, legacyResults);
    store.set(LEGACY_CORE12_KEYS.recent, JSON.stringify([["AS-D01"]]));

    const report = storage.migrateLegacyStorage();

    expect(report.migrated).toContain(LEGACY_CORE12_KEYS.results);
    expect(report.migrated).toContain(LEGACY_CORE12_KEYS.recent);
    // 값이 그대로 보존된다
    expect(store.get(NEXT.results)).toBe(legacyResults);
    // 기존 key는 정리된다
    expect(store.has(LEGACY_CORE12_KEYS.results)).toBe(false);
    expect(store.has(LEGACY_CORE12_KEYS.recent)).toBe(false);

    // 과거 결과의 응답·점수·유형코드가 그대로 열린다
    const loaded = storage.getResult("legacy-1")!;
    expect(loaded.code).toBe("1-0-1-0-1-0");
    expect(loaded.answers["AS-D01"]).toBe(2);
    expect(loaded.energyScores["추진"]).toBe(68);
    expect(loaded.typePersonaName).toBe("기존 결과");
    expect(loaded.typeDatasetVersion).toBe("2.1");
    expect(storage.getRecentQuestionIds()).toEqual(["AS-D01"]);
  });

  it("신규 key가 이미 있으면 덮어쓰지 않는다", () => {
    store.set(NEXT.results, JSON.stringify([{ sessionId: "new" }]));
    store.set(LEGACY_CORE12_KEYS.results, JSON.stringify([{ sessionId: "old" }]));

    const report = storage.migrateLegacyStorage();

    expect(report.skipped).toContain(LEGACY_CORE12_KEYS.results);
    expect(JSON.parse(store.get(NEXT.results)!)[0].sessionId).toBe("new");
    expect(store.has(LEGACY_CORE12_KEYS.results)).toBe(false);
  });

  it("진행 중이던 세션도 이전되어 같은 36문항으로 이어진다", () => {
    const session = storage.startNewSession();
    const ids = [...session.questionIds];
    session.currentIndex = 7;
    session.answers[ids[0]] = 5;
    storage.saveSession(session);
    // 신규 저장을 legacy 상태로 되돌려 이전 버전 사용자 상황을 재현한다
    store.set(LEGACY_CORE12_KEYS.session, store.get(NEXT.session)!);
    store.delete(NEXT.session);

    storage.migrateLegacyStorage();

    const restored = storage.getActiveSession()!;
    expect(restored.questionIds).toEqual(ids);
    expect(restored.currentIndex).toBe(7);
    expect(restored.answers[ids[0]]).toBe(5);
  });

  it("신규 데이터만 있는 사용자는 영향을 받지 않는다", () => {
    const s = storage.startNewSession();
    const ids = [...s.questionIds];
    for (const q of storage.questionsOf(s)) s.answers[q.id] = 4;
    const r = storage.completeSession(s);
    const before = new Map(store);

    const report = storage.migrateLegacyStorage();

    expect(report.migrated).toEqual([]);
    expect(report.skipped).toEqual([]);
    expect([...store.entries()]).toEqual([...before.entries()]);
    expect(storage.getResult(r.sessionId)!.code).toBe(r.code);
    expect(storage.getResult(r.sessionId)!.questionIds).toEqual(ids);
  });

  it("legacy 데이터가 손상돼 있어도 앱이 죽지 않는다", () => {
    store.set(LEGACY_CORE12_KEYS.results, "{깨진 JSON");
    store.set(LEGACY_CORE12_KEYS.session, "null");

    expect(() => storage.migrateLegacyStorage()).not.toThrow();

    // 손상 값은 그대로 옮겨지되, 읽기 계층이 안전하게 방어한다
    expect(storage.getResults()).toEqual([]);
    expect(storage.getActiveSession()).toBeNull();
    expect(storage.getLatestResult()).toBeNull();
    // 이후 새 검사는 정상 동작한다
    const fresh = storage.startNewSession();
    expect(fresh.questionIds).toHaveLength(36);
  });

  it("legacy 세션의 문항 ID가 유효하지 않으면 새 검사로 시작한다", () => {
    const s = storage.startNewSession();
    s.questionIds[3] = "NOT-A-REAL-ID";
    store.set(LEGACY_CORE12_KEYS.session, JSON.stringify(s));
    store.delete("mycore12.activeSession.v1");

    storage.migrateLegacyStorage();

    expect(storage.getActiveSession()).toBeNull();
    expect(storage.startNewSession().questionIds).toHaveLength(36);
  });

  it("빈 상태에서 migration 후 정상 동작한다", () => {
    storage.migrateLegacyStorage();
    expect(storage.getResults()).toEqual([]);
    expect(storage.getActiveSession()).toBeNull();
    expect(storage.getRecentQuestionIds()).toEqual([]);
    const s = storage.startNewSession();
    expect(s.questionIds).toHaveLength(36);
  });

  it("legacy 데이터가 없으면 아무 것도 하지 않는다", () => {
    const report = storage.migrateLegacyStorage();
    expect(report.migrated).toEqual([]);
    expect(report.skipped).toEqual([]);
  });

  it("신규 저장은 항상 mycore12 key를 사용한다", () => {
    const s = storage.startNewSession();
    for (const q of storage.questionsOf(s)) s.answers[q.id] = 3;
    storage.completeSession(s);
    expect(store.has(NEXT.results)).toBe(true);
    expect(store.has(NEXT.recent)).toBe(true);
    expect([...store.keys()].every(k => k.startsWith("mycore12."))).toBe(true);
  });

  it("내 결과 삭제가 legacy key까지 정리한다", () => {
    store.set(LEGACY_CORE12_KEYS.results, "[]");
    store.set(NEXT.results, "[]");
    storage.deleteAllLocalData();
    expect([...store.keys()]).toEqual([]);
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
