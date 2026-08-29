/**
 * 12에너지 링의 라벨 배치 규칙 (Orbit / EnergyMap 공용).
 *
 * 왜 필요한가
 *   한국어 에너지명은 두 글자(추진·숙고 …)라 링 바깥 같은 반지름에 놓아도
 *   충분하지만, 영어 표시명은 최대 12자(Coordination, Practicality)라
 *   같은 방식으로는 SVG 경계에서 잘리거나 서로 겹친다.
 *
 * 접근 방식
 *   1) 라벨을 바깥으로 밀어내는 대신 **차트 본체(polygon·node)를 줄여**
 *      링 바깥에 라벨 안전 영역(safe area)을 만든다.
 *   2) 라벨을 위치별 anchor 로 정렬해 글자가 중심 반대 방향으로 자라게 한다.
 *      (오른쪽=start, 왼쪽=end, 위/아래=middle)
 *   3) 긴 이름에만 약간의 추가 여백을 준다.
 *
 * 한국어는 기존 동작을 그대로 유지한다 (scale 1, anchor middle).
 *
 * 링 순서는 ENERGY_RING_ORDER 를 따른다 (index 0 = 12시, 시계 방향).
 *   0 추진 / 1 조율 / 2 창의 / 3 분석 / 4 공감 / 5 원칙
 *   6 숙고 / 7 자율 / 8 구체 / 9 통합 / 10 명료 / 11 유연
 */
import type { Locale } from "../i18n/resources";

/** 차트 본체(외곽 다각형·node)의 반지름 배율 */
export const chartScale = (locale: Locale): number =>
  locale === "en" ? 0.8 : 1;

/**
 * viewBox 좌우·상하로 넓히는 여백(px).
 * 본체를 줄이는 것만으로는 "Integration"·"Practicality" 처럼 긴 왼쪽 라벨이
 * 원래 경계를 넘어서므로, safe area 를 실제 좌표 공간으로도 확보한다.
 */
export const viewBoxPad = (locale: Locale): number =>
  locale === "en" ? 30 : 0;

/** node 원의 반지름 배율 — 본체를 줄여도 node 는 거의 그대로 둔다 */
export const nodeScale = (locale: Locale): number =>
  locale === "en" ? 0.92 : 1;

export type Anchor = "start" | "middle" | "end";

export interface LabelPlacement {
  anchor: Anchor;
  /** 라벨 반지름 = 축소된 본체 반지름 × 이 값 */
  radiusRatio: number;
  dx: number;
  dy: number;
}

/** 영어에서 특히 긴 이름 — 바깥 방향으로 여유를 조금 더 준다 */
const LONG_NAMES = new Set([
  "조율", // Coordination
  "구체", // Practicality
  "숙고", // Deliberation
  "통합", // Integration
  "유연" // Flexibility
]);

/**
 * 위치별 배치.
 * index 는 ENERGY_RING_ORDER 상의 위치, energy 는 내부 한국어 key 다.
 */
export function labelPlacement(
  index: number,
  energy: string,
  locale: Locale
): LabelPlacement {
  if (locale !== "en") {
    // 한국어: 기존과 동일 (모두 같은 반지름, 가운데 정렬)
    return { anchor: "middle", radiusRatio: 1.21, dx: 0, dy: 0 };
  }

  const long = LONG_NAMES.has(energy);

  // 12시 / 6시는 가운데 정렬하고 세로로만 띄운다
  if (index === 0) {
    return { anchor: "middle", radiusRatio: 1.16, dx: 0, dy: -4 };
  }
  if (index === 6) {
    return { anchor: "middle", radiusRatio: 1.16, dx: 0, dy: long ? 8 : 6 };
  }

  // 오른쪽 절반(1~5)은 글자가 오른쪽으로, 왼쪽 절반(7~11)은 왼쪽으로 자란다
  const right = index >= 1 && index <= 5;
  const anchor: Anchor = right ? "start" : "end";
  const outward = right ? 1 : -1;

  // 정확히 3시/9시 방향은 링에 더 붙여도 되지만, 긴 이름은 여유를 준다
  const horizontal = index === 3 || index === 9;
  const radiusRatio = horizontal ? 1.06 : 1.12;
  const dx = outward * (long ? 8 : 6);

  // 대각선 위치는 위/아래로 살짝 밀어 node 와 겹치지 않게 한다
  const upper = index === 1 || index === 2 || index === 10 || index === 11;
  const lower = index === 4 || index === 5 || index === 7 || index === 8;
  const dy = horizontal ? 0 : upper ? -3 : lower ? 4 : 0;

  return { anchor, radiusRatio, dx, dy };
}
