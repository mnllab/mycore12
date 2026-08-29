import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  drawAssessment,
  scoreAssessment
} from "../src/vendor/positive_assessment_engine_FINAL_v3.1.js";
import { POSITIVE_QUESTION_BANK } from "../src/vendor/positive_144_situational_question_bank_FINAL_v3.1.js";
import typeDataset from "../src/data/positive_64_type_dataset_bundle_v2.1.json";

const BANK = POSITIVE_QUESTION_BANK as any;
const TYPES = (typeDataset as any).types as any[];
const AXES = BANK.axes as { axis: string; pole1: string; pole0: string }[];
const CONTEXTS = BANK.contexts.map((c: any) => c.context) as string[];

/* ---------- 유형 데이터 무결성 ---------- */
describe("64 type dataset", () => {
  it("정확히 64개 유형이 존재한다", () => {
    expect(TYPES.length).toBe(64);
  });

  it("code가 모두 고유하며 가능한 64개 코드를 모두 커버한다", () => {
    const codes = new Set(TYPES.map(t => t.code));
    expect(codes.size).toBe(64);
    for (let n = 0; n < 64; n++) {
      const code = n.toString(2).padStart(6, "0").split("").join("-");
      expect(codes.has(code)).toBe(true);
    }
  });

  it("모든 유형에 필수 콘텐츠 필드가 존재한다", () => {
    const fields = [
      "personaName", "energySignature", "headline", "overview", "strengths",
      "workStyle", "decisionStyle", "relationshipStyle", "collaborationGuide",
      "teamContribution", "goodFitSituations", "cautions", "developmentGuide",
      "developmentRoadmap", "stressSignals", "recoveryStrategies",
      "selfCoachingQuestions", "encouragement", "interpretationNote"
    ];
    for (const t of TYPES) {
      for (const f of fields) expect(t[f], `${t.code}.${f}`).toBeTruthy();
    }
  });

  it("000000과 111111 유형이 동일한 필드 구조(위계)를 가진다", () => {
    const a = TYPES.find(t => t.bitString === "000000");
    const b = TYPES.find(t => t.bitString === "111111");
    expect(Object.keys(a!).sort()).toEqual(Object.keys(b!).sort());
  });
});

/* ---------- 문항은행 무결성 ---------- */
describe("question bank", () => {
  const active = BANK.questions.filter((q: any) => q.active);

  it("active 문항이 정확히 144개다", () => {
    expect(active.length).toBe(144);
  });

  it("축별로 24문항씩이다", () => {
    for (const axis of AXES) {
      expect(active.filter((q: any) => q.axis === axis.axis).length).toBe(24);
    }
  });

  it("축×상황 슬롯마다 4문항씩이다", () => {
    for (const axis of AXES) {
      for (const ctx of CONTEXTS) {
        const n = active.filter(
          (q: any) => q.axis === axis.axis && q.context === ctx
        ).length;
        expect(n, `${axis.axis}/${ctx}`).toBe(4);
      }
    }
  });

  it("각 축에서 optionA 방향이 pole1:pole0 = 12:12이다", () => {
    for (const axis of AXES) {
      const items = active.filter((q: any) => q.axis === axis.axis);
      const p1 = items.filter((q: any) => q.optionAValue === axis.pole1).length;
      expect(p1, axis.axis).toBe(12);
      expect(items.length - p1, axis.axis).toBe(12);
    }
  });
});

/* ---------- 36문항 추출 (1,000회 랜덤 반복) ---------- */
describe("drawAssessment — 1000 iterations", () => {
  it("항상 36문항, 축별 6문항, 축별 6개 고유 상황, A방향 3:3을 만족한다", () => {
    for (let i = 0; i < 1000; i++) {
      const items = drawAssessment() as any[];
      expect(items.length).toBe(36);
      const ids = new Set(items.map(q => q.id));
      expect(ids.size).toBe(36);
      for (const axis of AXES) {
        const axisItems = items.filter(q => q.axis === axis.axis);
        expect(axisItems.length).toBe(6);
        expect(new Set(axisItems.map(q => q.context)).size).toBe(6);
        const p1A = axisItems.filter(q => q.optionAValue === axis.pole1).length;
        expect(p1A).toBe(3);
      }
    }
  });

  it("recentlySeenIds 회피가 동작한다 (unseen이 있는 슬롯에서는 재출제하지 않음)", () => {
    const first = drawAssessment() as any[];
    const seen = first.map(q => q.id);
    // 슬롯당 후보 2개(3:3 방향 기준), 직전 1회 회피는 항상 가능
    for (let i = 0; i < 200; i++) {
      const next = drawAssessment({ recentlySeenIds: seen }) as any[];
      const overlap = next.filter(q => seen.includes(q.id));
      expect(overlap.length).toBe(0);
    }
  });
});

/* ---------- 채점 ---------- */
describe("scoreAssessment", () => {
  const items = drawAssessment() as any[];

  it("무작위 응답에서 pair 합 100, 12에너지 합 600, code가 항상 매칭된다", () => {
    for (let i = 0; i < 300; i++) {
      const answers: Record<string, number> = {};
      for (const q of items) answers[q.id] = 1 + Math.floor(Math.random() * 5);
      const r = scoreAssessment(items, answers) as any;

      for (const axis of AXES) {
        const ar = r.axisResults[axis.axis];
        expect(ar.pole1Score + ar.pole0Score).toBeCloseTo(100, 5);
      }
      const total = Object.values(r.energyScores as Record<string, number>).reduce(
        (a, b) => a + b,
        0
      );
      expect(total).toBeCloseTo(600, 5);
      expect(Object.keys(r.energyScores).length).toBe(12);

      const matched = TYPES.find(t => t.code === r.code);
      expect(matched, r.code).toBeTruthy();
    }
  });

  it("모든 응답이 3이면 모든 축이 정확히 50:50이다", () => {
    const answers: Record<string, number> = {};
    for (const q of items) answers[q.id] = 3;
    const r = scoreAssessment(items, answers) as any;
    for (const axis of AXES) {
      expect(r.axisResults[axis.axis].pole1Score).toBe(50);
      expect(r.axisResults[axis.axis].pole0Score).toBe(50);
    }
  });

  it("A/B 방향은 화면 위치가 아니라 optionAValue 기준으로 채점된다", () => {
    // pole0가 A에 오는 문항에 '매우 A(1)'로 답하면 pole0 쪽 점수가 커야 한다
    const q = (BANK.questions as any[]).find(
      x => x.active && x.optionAValue === x.pole0
    );
    const axis = AXES.find(a => a.axis === q.axis)!;
    const single = [q];
    const r = scoreAssessment(single, { [q.id]: 1 }) as any;
    expect(r.axisResults[axis.axis].pole0Score).toBe(100);
    expect(r.axisResults[axis.axis].pole1Score).toBe(0);
  });
});

/* ---------- UI 문구/시각화 규칙 ---------- */
describe("UI source rules", () => {
  const collect = (dir: string): string[] => {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) out.push(...collect(p));
      else if (/\.(tsx?|css)$/.test(name)) out.push(p);
    }
    return out;
  };
  const appFiles = [
    ...collect(join(__dirname, "../src/pages")),
    ...collect(join(__dirname, "../src/components")),
    join(__dirname, "../src/styles/global.css")
  ];
  const source = appFiles.map(f => readFileSync(f, "utf8")).join("\n");

  it("금지 표현(High/Low, 결핍, 약점, 우수/열등)이 UI 소스에 없다", () => {
    for (const banned of ["High", "Low", "결핍", "약점", "우열등", "우수/열등", "열등"]) {
      expect(source.includes(banned), banned).toBe(false);
    }
  });

  it("filled radar를 만들지 않는다 (connector polygon은 fill=none)", () => {
    const map = readFileSync(join(__dirname, "../src/components/EnergyMap.tsx"), "utf8");
    const polygonFills = [...map.matchAll(/<polygon[\s\S]*?fill="([^"]+)"/g)].map(
      m => m[1]
    );
    expect(polygonFills.length).toBeGreaterThan(0);
    for (const f of polygonFills) expect(f).toBe("none");
  });

  it("사용자 화면에 bitString/typeNumber를 노출하지 않는다", () => {
    const result = readFileSync(join(__dirname, "../src/pages/Result.tsx"), "utf8");
    expect(result.includes("matched.bitString")).toBe(false);
    expect(result.includes("matched.typeNumber")).toBe(false);
    expect(result.includes("{stored.code}")).toBe(false);
  });
});
