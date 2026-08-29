import { useMemo, useState } from "react";
import { AXES, ENERGY_RING_ORDER, ENERGY_TO_AXIS } from "../lib/mycore12";
import { useI18n } from "../i18n/useI18n";
import { chartScale, labelPlacement, nodeScale, viewBoxPad } from "./energyRingLabels";

/**
 * 마이코어12(MYCORE12) 12 Energy Map.
 *
 * 절대 규칙
 * - 모든 사람에게 동일한 크기의 고정 정12각형 외곽 프레임
 * - 50 기준선(점선 링) 표시
 * - 개인 차이는 node / marker / 얇은 연결선으로만 표현
 * - 내부 면적 채우기 금지, 면적값 계산·표시 금지
 *
 * 각 축의 두 에너지는 링에서 정반대(180°)에 놓여 pair 관계가 드러난다.
 *
 * 색: 12개 에너지에 채도를 낮춘 muted color 를 하나씩 준다. 구조선(외곽 12각형,
 * spoke, 50 기준선)은 중립 회색을 유지하고 node 와 label 에만 색을 쓴다.
 * 색은 구분 보조 수단이며 라벨 텍스트를 항상 함께 표시한다(색각 이상 대응).
 */
const energyColor = (energy: string) => `var(--energy-${energy})`;
export default function EnergyMap({
  energyScores,
  animate = false
}: {
  energyScores: Record<string, number>;
  animate?: boolean;
}) {
  const { locale, t, fill, energy: energyLabel, axis: axisLabel } = useI18n();
  const size = 468;
  const c = size / 2;
  // 영어는 라벨이 길어 본체(외곽 12각형·데이터 다각형)를 줄이고
  // 그만큼 확보된 바깥 여백을 라벨 안전 영역으로 쓴다
  const scale = chartScale(locale);
  const rOuter = 166 * scale;
  const rMin = 28 * scale; // 0점도 중앙에 뭉치지 않게 하는 시각적 최소 반경
  const nodeR = nodeScale(locale);
  const pad = viewBoxPad(locale);
  const [active, setActive] = useState<string | null>(null);

  const nodes = useMemo(
    () =>
      ENERGY_RING_ORDER.map((energy, i) => {
        const angle = (Math.PI * 2 * i) / 12 - Math.PI / 2;
        const score = energyScores[energy] ?? 0;
        const r = rMin + ((rOuter - rMin) * score) / 100;
        const axis = ENERGY_TO_AXIS[energy];
        const place = labelPlacement(i, energy, locale);
        const rLabel = rOuter * place.radiusRatio;
        return {
          energy,
          score,
          axis,
          place,
          x: c + r * Math.cos(angle),
          y: c + r * Math.sin(angle),
          ox: c + rOuter * Math.cos(angle),
          oy: c + rOuter * Math.sin(angle),
          lx: c + rLabel * Math.cos(angle) + place.dx,
          ly: c + rLabel * Math.sin(angle) + place.dy
        };
      }),
    [energyScores, locale, rOuter, rMin]
  );

  const r50 = rMin + (rOuter - rMin) * 0.5;
  const shown = nodes.find(n => n.energy === active) ?? null;

  return (
    <figure style={{ margin: 0, width: "100%" }}>
      <svg
        viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`}
        role="img"
        aria-labelledby="emap-title emap-desc"
        onMouseLeave={() => setActive(null)}
      >
        <title id="emap-title">{t.energyMap.title}</title>
        <desc id="emap-desc">
          {nodes.map(n => `${energyLabel(n.energy)} ${n.score}`).join(", ")}.{" "}
          {t.energyMap.description}
        </desc>

        {/* 고정 외곽 12각형 — 결과와 무관하게 동일 */}
        <polygon
          points={nodes.map(n => `${n.ox},${n.oy}`).join(" ")}
          fill="none"
          stroke="var(--color-border-strong)"
          strokeWidth={1.2}
        />

        {/* 12 spokes */}
        {nodes.map(n => (
          <line
            key={`s-${n.energy}`}
            x1={c}
            y1={c}
            x2={n.ox}
            y2={n.oy}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        ))}

        {/* 50 기준선 */}
        <circle
          cx={c}
          cy={c}
          r={r50}
          fill="none"
          stroke="var(--color-border-strong)"
          strokeDasharray="2 6"
          strokeWidth={1}
        />
        <text
          x={c + 5}
          y={c - r50 - 6}
          fontSize={11}
          letterSpacing={1}
          fill="var(--color-text-muted)"
        >
          50
        </text>

        {/* marker 연결선 — 면적 채움 없음 */}
        <polygon
          points={nodes.map(n => `${n.x},${n.y}`).join(" ")}
          fill="none"
          stroke="var(--color-slate)"
          strokeOpacity={0.75}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />

        {/* score markers */}
        {nodes.map((n, i) => (
          <g
            key={n.energy}
            className={animate ? "node-reveal" : undefined}
            style={animate ? { animationDelay: `${i * 80}ms` } : undefined}
            tabIndex={0}
            role="button"
            aria-label={fill(t.energyMap.mapNodeAria, {
              energy: energyLabel(n.energy),
              score: n.score,
              axis: axisLabel(n.axis.axis),
              other: energyLabel(
                n.energy === n.axis.pole1 ? n.axis.pole0 : n.axis.pole1
              ),
              otherScore: Number((100 - n.score).toFixed(1))
            })}
            onMouseEnter={() => setActive(n.energy)}
            onFocus={() => setActive(n.energy)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(prev => (prev === n.energy ? null : n.energy))}
          >
            <circle
              cx={n.x}
              cy={n.y}
              r={(active === n.energy ? 11 : 9) * nodeR}
              fill="var(--color-surface)"
              stroke={energyColor(n.energy)}
              strokeWidth={2}
            />
            <circle cx={n.x} cy={n.y} r={3.4 * nodeR} fill={energyColor(n.energy)} />
          </g>
        ))}

        {/* 외곽 지점의 작은 색 marker — 어느 방향이 어떤 에너지인지 구분 보조 */}
        {nodes.map(n => (
          <circle
            key={`m-${n.energy}`}
            cx={n.ox}
            cy={n.oy}
            r={3 * nodeR}
            fill={energyColor(n.energy)}
            opacity={0.85}
          />
        ))}

        {/* labels — 색상만으로 구분하지 않도록 항상 텍스트 병기 */}
        {nodes.map(n => (
          <text
            key={`l-${n.energy}`}
            x={n.lx}
            y={n.ly}
            textAnchor={n.place.anchor}
            dominantBaseline="middle"
            fontSize={locale === "en" ? 16 : 18}
            fontWeight={active === n.energy ? 600 : 500}
            letterSpacing={-0.3}
            fill={active === n.energy ? energyColor(n.energy) : "var(--color-text-secondary)"}
          >
            {energyLabel(n.energy)}
          </text>
        ))}

        {/* 중앙에는 유형명을 넣지 않는다 */}
        <text
          x={c}
          y={c + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10.5}
          letterSpacing={1.4}
          fontWeight={600}
          fill="var(--color-text-muted)"
        >
          MYCORE12
        </text>
      </svg>

      <figcaption
        aria-live="polite"
        style={{
          textAlign: "center",
          minHeight: 46,
          fontSize: 13.5,
          lineHeight: 1.65,
          color: "var(--color-text-secondary)",
          padding: "4px 10px 0"
        }}
      >
        {shown
          ? fill(t.energyMap.mapDetail, {
              energy: energyLabel(shown.energy),
              score: shown.score,
              axis: axisLabel(shown.axis.axis),
              other: energyLabel(
                shown.energy === shown.axis.pole1
                  ? shown.axis.pole0
                  : shown.axis.pole1
              ),
              otherScore: Number((100 - shown.score).toFixed(1))
            })
          : t.energyMap.baseline}
      </figcaption>

      {/* 접근성: 차트 값의 텍스트 대체 */}
      <ul className="sr-only">
        {AXES.map(a => (
          <li key={a.axis}>
            {fill(t.energyMap.srAxis, {
              axis: axisLabel(a.axis),
              pole1: energyLabel(a.pole1),
              score1: energyScores[a.pole1],
              pole0: energyLabel(a.pole0),
              score0: energyScores[a.pole0]
            })}
          </li>
        ))}
      </ul>
    </figure>
  );
}
