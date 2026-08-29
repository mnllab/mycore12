import { ENERGY_RING_ORDER } from "../lib/mycore12";

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
    return {
      energy,
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
        stroke="var(--color-border)"
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
          stroke="var(--color-primary-soft)"
          strokeWidth={1.4}
        />
      ))}
      <circle cx={cx} cy={cy} r={rOuter * 0.55} fill="none" stroke="var(--color-border)" strokeDasharray="3 6" />
      {nodes.map(n => (
        <g key={n.energy}>
          <circle cx={n.x} cy={n.y} r={9} fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth={2} />
          <circle cx={n.x} cy={n.y} r={3.2} fill="var(--color-primary)" />
          <text
            x={n.lx}
            y={n.ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={15}
            fontWeight={500}
            fill="var(--color-text-secondary)"
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
        fill="var(--color-text-muted)"
      >
        MYCORE12
      </text>
    </svg>
  );
}
