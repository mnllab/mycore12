/**
 * 출제 순서 보정 (표시 순서 전용).
 *
 * 원본 엔진 drawAssessment()는 "같은 축 연속 없음"을 무작위 셔플 200회 재시도로
 * 달성하려 하는데, 36문항 × 축당 6문항 조건에서는 완전 무작위 셔플이 조건을
 * 만족할 확률이 낮아 재시도가 소진되는 경우가 실제로 발생한다(측정 결과 약 38%).
 * 그 경우 같은 축 문항이 연달아 나온다.
 *
 * 이 함수는 엔진이 뽑은 36문항 "집합"을 그대로 두고 표시 순서만 재배열한다.
 * 문항 구성(축별 6, 상황별 1, A방향 3:3)과 채점 결과는 순서와 무관하므로
 * 영향을 받지 않는다. 엔진 파일은 수정하지 않는다.
 */
export function spreadByAxis<T extends { axis: string }>(items: T[]): T[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const list = buckets.get(item.axis) ?? [];
    list.push(item);
    buckets.set(item.axis, list);
  }

  const out: T[] = [];
  let prevAxis: string | null = null;

  while (out.length < items.length) {
    // 남은 문항이 가장 많은 축부터 배치하되, 직전 축은 피한다.
    const candidates = [...buckets.entries()]
      .filter(([axis, list]) => list.length > 0 && axis !== prevAxis)
      .sort((a, b) => b[1].length - a[1].length);

    // 직전 축만 남은 극단적 경우에는 원본 순서를 유지한다 (36/6 구성에서는 발생하지 않음)
    const picked =
      candidates[0] ??
      [...buckets.entries()].find(([, list]) => list.length > 0)!;

    const [axis, list] = picked;
    out.push(list.shift()!);
    prevAxis = axis;
  }

  return out;
}

/** 인접한 같은 축 쌍의 개수 (테스트/검증용) */
export function countAdjacentSameAxis(items: { axis: string }[]): number {
  let n = 0;
  for (let i = 1; i < items.length; i++) {
    if (items[i].axis === items[i - 1].axis) n++;
  }
  return n;
}
