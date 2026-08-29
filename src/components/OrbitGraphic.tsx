import { ENERGY_RING_ORDER, ENERGY_TO_AXIS, PAIR_FAMILY } from "../lib/mycore12";

/**
 * 시작 화면용 고정 12-node orbit.
 * 결과가 아니므로 모든 node가 같은 궤도 위에 있다 —
 * "완성된 형태 안에서 각자의 에너지 위치가 달라진다"는 철학의 기본형.
 */
export default function OrbitGraphic() {
  const size = 400;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 142;
  const rLabel = 172;

  const nodes = ENERGY_RING_ORDER.map((energy, i) => {
    const angle = (Math.PI * 2 * i) / 12 - Math.PI / 2;
    const family = PAIR_FAMILY[ENERGY_TO_AXIS[energy].axis];
    return {
      energy,
      family,
      x: cx + rOuter * Math.cos(angle),
      y: cy + rOuter * Math.sin(angle),
      lx: cx + rLabel * Math.cos(angle),
      ly: cy + rLabel * Math.sin(angle)
    };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="12개의 에너지가 하나의 원 궤도 위에 배치된 마이코어12 브랜드 그래픽">
      <polygon
        points={nodes.map(n => `${n.x},${n.y}`).join(" ")}
        fill="none"
        stroke="var(--hairline-strong)"
        strokeWidth={1.2}
      />
      {/* 6개 대응축을 잇는 얇은 guide line */}
      {nodes.slice(0, 6).map((n, i) => (
        <line
          key={n.energy}
          x1={n.x}
          y1={n.y}
          x2={nodes[i + 6].x}
          y2={nodes[i + 6].y}
          stroke={n.family.soft}
          strokeWidth={1.4}
        />
      ))}
      <circle cx={cx} cy={cy} r={rOuter * 0.55} fill="none" stroke="var(--hairline)" strokeDasharray="3 6" />
      {nodes.map(n => (
        <g key={n.energy}>
          <circle cx={n.x} cy={n.y} r={9} fill="var(--surface)" stroke={n.family.strong} strokeWidth={2} />
          <circle cx={n.x} cy={n.y} r={3.2} fill={n.family.strong} />
          <text
            x={n.lx}
            y={n.ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={15}
            fontWeight={500}
            fill="var(--ink-2)"
          >
            {n.energy}
          </text>
        </g>
      ))}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        letterSpacing={1.6}
        fontWeight={560}
        fill="var(--ink-3)"
      >
        MYCORE12
      </text>
    </svg>
  );
}
