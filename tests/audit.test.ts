/**
 * 마이코어12(MYCORE12) 기능 전수 검수 (검수항목 1~24).
 * 원본 데이터·엔진을 기준으로 확인하며, 문항 내용·유형 데이터는 변경하지 않는다.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  drawAssessment,
  scoreAssessment
} from "../src/vendor/positive_assessment_engine_FINAL_v3.1.js";
import { POSITIVE_QUESTION_BANK } from "../src/vendor/positive_144_situational_question_bank_FINAL_v3.1.js";
import typeDataset from "../src/data/MYCORE12_64_type_dataset_v3.0.json";
import bankJson from "../src/data/positive_144_situational_question_bank_FINAL_v3.1.json";
import { spreadByAxis, countAdjacentSameAxis } from "../src/lib/ordering";
import { publicInterpretationNote } from "../src/lib/mycore12";

const BANK = POSITIVE_QUESTION_BANK as any;
const TYPES = (typeDataset as any).types as any[];
const AXES = BANK.axes as { axis: string; pole1: string; pole0: string }[];
const CONTEXTS = BANK.contexts.map((c: any) => c.context) as string[];
const ROOT = join(__dirname, "..");
const src = (p: string) => readFileSync(join(ROOT, p), "utf8");

const drawOrdered = (opts?: { recentlySeenIds?: string[] }) =>
  spreadByAxis(drawAssessment(opts as any) as any[]);

/* ── 1. 144문항 원본 로드 ── */
describe("1. 144문항 원본 로드", () => {
  it("앱이 원본 ES Module을 import하며 active 문항이 144개다", () => {
    expect(src("src/lib/mycore12.ts")).toContain(
      "../vendor/positive_144_situational_question_bank_FINAL_v3.1.js"
    );
    expect(BANK.questions.filter((q: any) => q.active).length).toBe(144);
    expect(BANK.questionBankSize).toBe(144);
  });

  it("vendor ES Module과 원본 JSON 내용이 동일하다 (복제·축약본 아님)", () => {
    expect(JSON.stringify(BANK)).toBe(JSON.stringify(bankJson));
  });
});

/* ── 2. 64유형 원본 로드 ── */
describe("2. 64유형 원본 로드", () => {
  it("원본 JSON을 import하며 64유형·고유 code·전체 코드공간을 커버한다", () => {
    expect(src("src/lib/mycore12.ts")).toContain(
      "../data/MYCORE12_64_type_dataset_v3.0.json"
    );
    expect(TYPES.length).toBe(64);
    const codes = new Set(TYPES.map(t => t.code));
    expect(codes.size).toBe(64);
    for (let n = 0; n < 64; n++) {
      expect(codes.has(n.toString(2).padStart(6, "0").split("").join("-"))).toBe(true);
    }
  });

  it("결과 화면에서 쓰는 콘텐츠 필드가 64유형 전부에 존재한다", () => {
    const fields = [
      "personaName", "energySignature", "headline", "overview", "strengths",
      "workStyle", "decisionStyle", "relationshipStyle", "collaborationGuide",
      "teamContribution", "goodFitSituations", "cautions", "developmentGuide",
      "developmentRoadmap", "stressSignals", "recoveryStrategies",
      "selfCoachingQuestions", "encouragement", "interpretationNote"
    ];
    for (const t of TYPES) for (const f of fields) expect(t[f], `${t.code}.${f}`).toBeTruthy();
  });
});

/* ── 3 & 12. 엔진 함수 사용 ── */
describe("3·12. 엔진 함수 사용", () => {
  it("앱이 drawAssessment / scoreAssessment 를 직접 호출한다", () => {
    const storage = src("src/lib/storage.ts");
    expect(storage).toContain("../vendor/positive_assessment_engine_FINAL_v3.1.js");
    expect(storage).toContain("drawAssessment");
    expect(storage).toContain("scoreAssessment(items, session.answers)");
  });

  it("앱 코드가 추출·채점 로직을 자체 재구현하지 않는다", () => {
    const appSrc = ["src/lib", "src/pages", "src/components"]
      .flatMap(d => {
        const walk = (dir: string): string[] =>
          readdirSync(join(ROOT, dir)).flatMap(n => {
            const rel = `${dir}/${n}`;
            return statSync(join(ROOT, rel)).isDirectory()
              ? walk(rel)
              : /\.tsx?$/.test(n)
              ? [rel]
              : [];
          });
        return walk(d);
      })
      .map(f => src(f))
      .join("\n");
    // 응답 가중치 테이블을 앱 레이어에서 재정의하지 않는다
    expect(/0\.75[\s\S]{0,40}0\.25/.test(appSrc)).toBe(false);
    expect(appSrc.includes("RESPONSE_WEIGHT")).toBe(false);
  });
});

/* ── 4~8. 추출 구조 제약 (1,000회) ── */
describe("4~8. 36문항 추출 구조 제약 — 1,000회", () => {
  it("36문항 / 축별 6 / 축별 6개 상황 각 1개 / A방향 3:3 / 같은 축 연속 없음", () => {
    let maxAdjacent = 0;
    for (let i = 0; i < 1000; i++) {
      const items = drawOrdered();

      expect(items.length).toBe(36);                                   // 4
      expect(new Set(items.map(q => q.id)).size).toBe(36);

      for (const axis of AXES) {
        const axisItems = items.filter(q => q.axis === axis.axis);
        expect(axisItems.length).toBe(6);                              // 5
        expect(new Set(axisItems.map(q => q.context)).size).toBe(6);   // 6
        expect(axisItems.map(q => q.context).sort()).toEqual([...CONTEXTS].sort());
        expect(
          axisItems.filter(q => q.optionAValue === axis.pole1).length
        ).toBe(3);                                                     // 7
        expect(
          axisItems.filter(q => q.optionAValue === axis.pole0).length
        ).toBe(3);
      }

      maxAdjacent = Math.max(maxAdjacent, countAdjacentSameAxis(items)); // 8
    }
    expect(maxAdjacent).toBe(0);
  });

  it("순서 보정은 문항 집합을 바꾸지 않는다 (구성 불변)", () => {
    for (let i = 0; i < 200; i++) {
      const raw = drawAssessment() as any[];
      const ordered = spreadByAxis(raw);
      expect(ordered.map(q => q.id).sort()).toEqual(raw.map(q => q.id).sort());
    }
  });
});

/* ── 13~17. 채점 정확성 ── */
describe("13~17. 채점 정확성", () => {
  it("13. 응답 1~5가 100/75/50/25/0 으로 정확히 변환된다 (A=pole1 문항)", () => {
    const q = BANK.questions.find((x: any) => x.active && x.optionAValue === x.pole1);
    const expected: Record<number, number> = { 1: 100, 2: 75, 3: 50, 4: 25, 5: 0 };
    for (const [response, score] of Object.entries(expected)) {
      const r = scoreAssessment([q], { [q.id]: Number(response) }) as any;
      expect(r.axisResults[q.axis].pole1Score, `응답 ${response}`).toBe(score);
    }
  });

  it("13. A에 pole0가 오는 문항도 화면 위치가 아닌 optionAValue 기준으로 채점된다", () => {
    const q = BANK.questions.find((x: any) => x.active && x.optionAValue === x.pole0);
    const expected: Record<number, number> = { 1: 0, 2: 25, 3: 50, 4: 75, 5: 100 };
    for (const [response, score] of Object.entries(expected)) {
      const r = scoreAssessment([q], { [q.id]: Number(response) }) as any;
      expect(r.axisResults[q.axis].pole1Score, `응답 ${response}`).toBe(score);
    }
  });

  it("14·15·16. 무작위 500회: pair 합 100 / 총합 600 / code 매칭", () => {
    for (let i = 0; i < 500; i++) {
      const items = drawOrdered();
      const answers: Record<string, number> = {};
      for (const q of items) answers[q.id] = 1 + Math.floor(Math.random() * 5);
      const r = scoreAssessment(items, answers) as any;

      for (const axis of AXES) {
        const ar = r.axisResults[axis.axis];
        expect(ar.pole1Score + ar.pole0Score).toBeCloseTo(100, 6);     // 14
      }
      const scores = Object.values(r.energyScores as Record<string, number>);
      expect(scores.length).toBe(12);
      expect(scores.reduce((a, b) => a + b, 0)).toBeCloseTo(600, 6);   // 15
      expect(TYPES.filter(t => t.code === r.code).length).toBe(1);     // 16
    }
  });

  it("17. 전 문항 3 응답이면 모든 축이 정확히 50:50이다", () => {
    for (let i = 0; i < 50; i++) {
      const items = drawOrdered();
      const answers: Record<string, number> = {};
      for (const q of items) answers[q.id] = 3;
      const r = scoreAssessment(items, answers) as any;
      for (const axis of AXES) {
        expect(r.axisResults[axis.axis].pole1Score).toBe(50);
        expect(r.axisResults[axis.axis].pole0Score).toBe(50);
      }
      expect(Object.values(r.energyScores as Record<string, number>).every(v => v === 50)).toBe(true);
    }
  });

  it("잘못된 응답값은 엔진이 명시적으로 오류를 낸다", () => {
    const items = drawOrdered();
    const answers: Record<string, number> = {};
    for (const q of items) answers[q.id] = 3;
    answers[items[0].id] = 9;
    expect(() => scoreAssessment(items, answers)).toThrow();
  });
});

/* ── 18~20. 사용자 노출 규칙 ── */
describe("18~20. 사용자 노출 규칙", () => {
  const uiFiles = ["src/pages", "src/components"].flatMap(d => {
    const walk = (dir: string): string[] =>
      readdirSync(join(ROOT, dir)).flatMap(n => {
        const rel = `${dir}/${n}`;
        return statSync(join(ROOT, rel)).isDirectory()
          ? walk(rel)
          : /\.tsx$/.test(n)
          ? [rel]
          : [];
      });
    return walk(d);
  });
  const uiSource = uiFiles.map(f => src(f)).join("\n");

  it("18. 0/1 코드·bitString·typeNumber를 렌더링하지 않는다", () => {
    expect(uiSource.includes("matched.bitString")).toBe(false);
    expect(uiSource.includes("matched.typeNumber")).toBe(false);
    expect(uiSource.includes("{stored.code}")).toBe(false);
    expect(uiSource.includes("scoreView.code")).toBe(false);
  });

  it("18. 화면에 렌더되는 interpretationNote에 0/1 코드가 남지 않는다 (64유형 전수)", () => {
    for (const t of TYPES) {
      const shown = publicInterpretationNote(t.interpretationNote);
      expect(shown.length, t.code).toBeGreaterThan(0);
      expect(/\d-\d-\d-\d-\d-\d/.test(shown), t.code).toBe(false);
      expect(/\b[01]{6}\b/.test(shown), t.code).toBe(false);
      expect(shown.includes("내부 코드"), t.code).toBe(false);
    }
  });

  it("19. High/Low·발현/잠재·결핍·우열 표현이 UI 소스와 64유형 콘텐츠에 없다", () => {
    const banned = ["High", "Low", "발현", "잠재", "결핍", "열등", "우수", "약점"];
    for (const b of banned) expect(uiSource.includes(b), `UI: ${b}`).toBe(false);

    // 유형 콘텐츠(사용자 노출 필드)에도 없어야 한다. metadata(지침)는 제외한다.
    const userFacing = JSON.stringify(TYPES);
    for (const b of banned) expect(userFacing.includes(b), `유형 데이터: ${b}`).toBe(false);
  });

  it("20. 000000과 111111이 동일한 필드 구조·동일 섹션 수를 가진다", () => {
    const a = TYPES.find(t => t.bitString === "000000")!;
    const b = TYPES.find(t => t.bitString === "111111")!;
    const shape = (o: any) =>
      Object.fromEntries(
        Object.entries(o).map(([k, v]) => [
          k,
          Array.isArray(v) ? `array:${v.length}` : typeof v
        ])
      );
    expect(shape(a)).toEqual(shape(b));
    // 결과 화면은 code에 따라 분기하지 않는다 (같은 레이아웃·위계)
    expect(/bitString\s*===|code\s*===\s*"[01-]/.test(src("src/pages/Result.tsx"))).toBe(false);
  });
});

/* ── 24. 오류 처리 ── */
describe("24. 데이터 부재·손상 시 오류 처리", () => {
  it("유형 매칭 실패는 조용히 넘어가지 않고 명시적 오류를 던진다", async () => {
    const { matchType } = await import("../src/lib/mycore12");
    expect(() => matchType("9-9-9-9-9-9")).toThrow(/매칭 실패/);
  });

  it("Result 화면이 결과 부재·매칭 실패를 모두 처리한다", () => {
    const result = src("src/pages/Result.tsx");
    expect(result).toContain("결과를 찾을 수 없어요");
    expect(result).toContain("matchError");
    expect(result).toContain("try {");
  });

  it("ErrorBoundary가 라우트를 감싸고 있다", () => {
    expect(src("src/App.tsx")).toContain("<ErrorBoundary>");
    expect(src("src/components/ErrorBoundary.tsx")).toContain("getDerivedStateFromError");
  });
});

/* ── 원본 데이터 무결성 (PACKAGE_MANIFEST.json 기준 SHA256) ── */
describe("원본 Source of Truth 무결성", () => {
  const { createHash } = require("node:crypto");
  const EXPECTED: Record<string, string> = {
    "src/vendor/positive_assessment_engine_FINAL_v3.1.js":
      "6bced67c96cbc3df6340c0a030227e550236410dd92aec964c36ed463e12392e",
    "src/vendor/positive_144_situational_question_bank_FINAL_v3.1.js":
      "9546594f37adcb37e719dd1a1f0cef6f309c2fbf1dd581d28183186fd1fb6ae0",
    "src/data/positive_64_type_dataset_bundle_v2.1.json":
      "2a5a8e43c670c28bc6476c3d0d57249476a167a6b7dd29ba18398f7678eac756",
    "src/data/positive_144_situational_question_bank_FINAL_v3.1.json":
      "b3101002d20750771e935a48a866b22a451e7bfa848152de1f43075f727b69e0",
    // v3.0 = 정식 운영 결과 콘텐츠 (2026-08-29 전수 개편, 앱이 import하는 파일)
    "src/data/MYCORE12_64_type_dataset_v3.0.json":
      "2c311cbf8c17522e9c4b480535ac9561e77277ec7ac6ab6e84c27035d574135e",
    // v2.2 = v2.1에서 personaName(및 본문 내 이름 표기)만 확정 개편한 파생본 — 2026-08-29
    "src/data/positive_64_type_dataset_bundle_v2.2.json":
      "a26be6a44c602e5934020f5b74e5d1cda48f9e4cd2b2da9770dad4bfea065f62"
  };

  it("엔진·문항은행·유형 데이터가 원본과 바이트 단위로 동일하다", () => {
    for (const [path, sha] of Object.entries(EXPECTED)) {
      const actual = createHash("sha256")
        .update(readFileSync(join(ROOT, path)))
        .digest("hex");
      expect(actual, path).toBe(sha);
    }
  });
});
