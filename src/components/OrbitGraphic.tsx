import { ENERGY_RING_ORDER } from "../lib/mycore12";
import { useI18n } from "../i18n/useI18n";
import { chartScale, labelPlacement, nodeScale, viewBoxPad } from "./energyRingLabels";

/**
 * 시작 화면용 고정 12-node orbit.
 * 결과가 아니므로 모든 node가 같은 궤도 위에 있다 —
 * "완성된 형태 안에서 각자의 에너지 위치가 달라진다"는 철학의 기본형.
 *
 * 내부 energy key(ENERGY_RING_ORDER)와 node 순서·좌표·색은 그대로 두고,
 * 화면에 보이는 라벨과 접근성 이름만 locale 표시명으로 바꾼다.
 */
export default function OrbitGraphic() {
  const { locale, t, energy: energyLabel } = useI18n();
  const size = 400;
  const cx = size / 2;
  const cy = size / 2;
  // 영어는 라벨이 길어 본체를 줄이고 그 자리를 라벨 안전 영역으로 쓴다
  const rOuter = 142 * chartScale(locale);
  const nodeR = nodeScale(locale);
  const pad = viewBoxPad(locale);

  const nodes = ENERGY_RING_ORDER.map((energy, i) => {
    const angle = (Math.PI * 2 * i) / 12 - Math.PI / 2;
    const place = labelPlacement(i, energy, locale);
    const rLabel = rOuter * place.radiusRatio;
    return {
      energy,
      place,
      x: cx + rOuter * Math.cos(angle),
      y: cy + rOuter * Math.sin(angle),
      lx: cx + rLabel * Math.cos(angle) + place.dx,
      ly: cy + rLabel * Math.sin(angle) + place.dy
    };
  });

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`}
      role="img"
      aria-label={t.orbit.aria}
    >
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
      <circle
        cx={cx}
        cy={cy}
        r={rOuter * 0.55}
        fill="none"
        stroke="var(--color-border)"
        strokeDasharray="3 6"
      />
      {nodes.map(n => (
        <g key={n.energy}>
          <circle
            cx={n.x}
            cy={n.y}
            r={9 * nodeR}
            fill="var(--color-surface)"
            stroke="var(--color-primary)"
            strokeWidth={2}
          />
          <circle cx={n.x} cy={n.y} r={3.2 * nodeR} fill="var(--color-primary)" />
          <text
            x={n.lx}
            y={n.ly}
            textAnchor={n.place.anchor}
            dominantBaseline="middle"
            fontSize={locale === "en" ? 14 : 15}
            fontWeight={500}
            fill="var(--color-text-secondary)"
          >
            {energyLabel(n.energy)}
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
