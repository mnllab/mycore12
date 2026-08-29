import { POSITIVE_QUESTION_BANK } from "./positive_144_situational_question_bank_FINAL_v3.1.js";

const shuffle = (array, rng = Math.random) => {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const pickOne = (items, rng = Math.random) =>
  items[Math.floor(rng() * items.length)];

export function drawAssessment({
  recentlySeenIds = [],
  rng = Math.random
} = {}) {
  const bank = POSITIVE_QUESTION_BANK.questions.filter(q => q.active);
  const recent = new Set(recentlySeenIds);
  const selected = [];

  for (const axis of POSITIVE_QUESTION_BANK.axes) {
    const axisItems = bank.filter(q => q.axis === axis.axis);
    const contexts = shuffle(
      POSITIVE_QUESTION_BANK.contexts.map(c => c.context),
      rng
    );

    // 축마다 6개 상황을 모두 사용하고, A에 pole1/pole0가 오는 문항을 3:3으로 맞춘다.
    const pole1AContexts = new Set(contexts.slice(0, 3));

    for (const context of contexts) {
      const requiredAValue = pole1AContexts.has(context)
        ? axis.pole1
        : axis.pole0;

      let pool = axisItems.filter(
        q => q.context === context && q.optionAValue === requiredAValue
      );

      const unseen = pool.filter(q => !recent.has(q.id));
      if (unseen.length > 0) pool = unseen;

      selected.push(pickOne(pool, rng));
    }
  }

  // 같은 축 문항이 연속되지 않도록 간단한 제약 셔플
  let result = shuffle(selected, rng);
  for (let attempt = 0; attempt < 200; attempt++) {
    let ok = true;
    for (let i = 1; i < result.length; i++) {
      if (result[i].axis === result[i - 1].axis) {
        ok = false;
        break;
      }
    }
    if (ok) break;
    result = shuffle(selected, rng);
  }

  return result;
}

const RESPONSE_WEIGHT = {
  1: { a: 1.00, b: 0.00 },
  2: { a: 0.75, b: 0.25 },
  3: { a: 0.50, b: 0.50 },
  4: { a: 0.25, b: 0.75 },
  5: { a: 0.00, b: 1.00 }
};

export function scoreAssessment(items, answers) {
  const result = {};

  for (const axis of POSITIVE_QUESTION_BANK.axes) {
    result[axis.axis] = {
      axisLabel: axis.label,
      pole1: axis.pole1,
      pole0: axis.pole0,
      pole1Points: 0,
      pole0Points: 0,
      itemCount: 0
    };
  }

  for (const item of items) {
    const response = Number(answers[item.id]);
    const weight = RESPONSE_WEIGHT[response];
    if (!weight) throw new Error(`문항 ${item.id}의 응답은 1~5여야 합니다.`);

    const r = result[item.axis];
    const aEnergy = item.optionAValue;
    const bEnergy = item.optionBValue;

    if (aEnergy === r.pole1) r.pole1Points += weight.a;
    else r.pole0Points += weight.a;

    if (bEnergy === r.pole1) r.pole1Points += weight.b;
    else r.pole0Points += weight.b;

    r.itemCount += 1;
  }

  const axisOrder = POSITIVE_QUESTION_BANK.axes.map(a => a.axis);
  const bits = [];
  const preferredEnergies = [];
  const energyScores = {};

  for (const axisName of axisOrder) {
    const r = result[axisName];
    const total = r.pole1Points + r.pole0Points;
    const pole1Score = Number((r.pole1Points / total * 100).toFixed(1));
    const pole0Score = Number((100 - pole1Score).toFixed(1));

    r.pole1Score = pole1Score;
    r.pole0Score = pole0Score;

    energyScores[r.pole1] = pole1Score;
    energyScores[r.pole0] = pole0Score;

    const bit = pole1Score >= 50 ? 1 : 0;
    bits.push(bit);
    preferredEnergies.push(bit ? r.pole1 : r.pole0);
  }

  return {
    code: bits.join("-"),
    bitString: bits.join(""),
    preferredEnergies,
    energyScores,
    axisResults: result
  };
}
