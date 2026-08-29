import { useMemo, useState } from "react";
import { AXES, ENERGY_RING_ORDER, ENERGY_TO_AXIS } from "../lib/mycore12";

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
 */
export default function EnergyMap({
  energyScores,
  animate = false
}: {
  energyScores: Record<string, number>;
  animate?: boolean;
}) {
  const size = 468;
  const c = size / 2;
  const rOuter = 166;
  const rLabel = 200;
  const rMin = 28; // 0점도 중앙에 뭉치지 않게 하는 시각적 최소 반경
  const [active, setActive] = useState<string | null>(null);

  const nodes = useMemo(
    () =>
      ENERGY_RING_ORDER.map((energy, i) => {
        const angle = (Math.PI * 2 * i) / 12 - Math.PI / 2;
        const score = energyScores[energy] ?? 0;
        const r = rMin + ((rOuter - rMin) * score) / 100;
        const axis = ENERGY_TO_AXIS[energy];
        return {
          energy,
          score,
          axis,
          x: c + r * Math.cos(angle),
          y: c + r * Math.sin(angle),
          ox: c + rOuter * Math.cos(angle),
          oy: c + rOuter * Math.sin(angle),
          lx: c + rLabel * Math.cos(angle),
          ly: c + rLabel * Math.sin(angle)
        };
      }),
    [energyScores]
  );

  const r50 = rMin + (rOuter - rMin) * 0.5;
  const shown = nodes.find(n => n.energy === active) ?? null;

  return (
    <figure style={{ margin: 0, width: "100%" }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-labelledby="emap-title emap-desc"
        onMouseLeave={() => setActive(null)}
      >
        <title id="emap-title">마이코어12 12 에너지 맵</title>
        <desc id="emap-desc">
          {nodes.map(n => `${n.energy} ${n.score}`).join(", ")}. 바깥 12각형은 모든
          사람에게 동일한 고정 형태이며, 각 점의 위치만 에너지의 상대 선호를
          나타냅니다. 도형의 넓이는 해석에 사용하지 않습니다.
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
            aria-label={`${n.energy} ${n.score}. ${n.axis.label}축에서 ${
              n.energy === n.axis.pole1 ? n.axis.pole0 : n.axis.pole1
            } ${Number((100 - n.score).toFixed(1))}와 함께 구성됩니다.`}
            onMouseEnter={() => setActive(n.energy)}
            onFocus={() => setActive(n.energy)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(prev => (prev === n.energy ? null : n.energy))}
          >
            <circle
              cx={n.x}
              cy={n.y}
              r={active === n.energy ? 11 : 9}
              fill="var(--color-surface)"
              stroke="var(--color-primary)"
              strokeWidth={2}
            />
            <circle cx={n.x} cy={n.y} r={3.4} fill="var(--color-primary)" />
          </g>
        ))}

        {/* labels — 색상만으로 구분하지 않도록 항상 텍스트 병기 */}
        {nodes.map(n => (
          <text
            key={`l-${n.energy}`}
            x={n.lx}
            y={n.ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={18}
            fontWeight={active === n.energy ? 600 : 500}
            letterSpacing={-0.3}
            fill={active === n.energy ? "var(--color-primary)" : "var(--color-text-secondary)"}
          >
            {n.energy}
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
        {shown ? (
          <>
            <b style={{ color: "var(--color-text)", fontWeight: 600 }} className="num">
              {shown.energy} {shown.score}
            </b>
            {" — "}
            {shown.axis.label}축에서{" "}
            {shown.energy === shown.axis.pole1 ? shown.axis.pole0 : shown.axis.pole1}{" "}
            <span className="num">{Number((100 - shown.score).toFixed(1))}</span>와 함께
            구성됩니다.
          </>
        ) : (
          "점선 원은 50 기준선입니다. 점을 선택하면 값을 볼 수 있습니다."
        )}
      </figcaption>

      {/* 접근성: 차트 값의 텍스트 대체 */}
      <ul className="sr-only">
        {AXES.map(a => (
          <li key={a.axis}>
            {a.label}: {a.pole1} {energyScores[a.pole1]}, {a.pole0}{" "}
            {energyScores[a.pole0]}
          </li>
        ))}
      </ul>
    </figure>
  );
}
