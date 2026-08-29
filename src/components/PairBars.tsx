import { AXES, isBalancedAxis, type ScoreResult } from "../lib/mycore12";

/**
 * 6개 양방향 pair balance bar.
 * `추진 68 ──●── 숙고 32` — 양쪽 값을 같은 크기·굵기로 병기하고,
 * 중앙선과 단일 node로만 위치를 표현한다. 강함/약함 라벨을 쓰지 않는다.
 */

/** 한국어 조사: 받침 유무에 따라 과/와 선택 */
const gwa = (w: string) => {
  const ch = w.charCodeAt(w.length - 1);
  const batchim = ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0;
  return `${w}${batchim ? "과" : "와"}`;
};

export default function PairBars({ result }: { result: ScoreResult }) {
  return (
    <div className="pair-bars">
      {AXES.map(axis => {
        const r = result.axisResults[axis.axis];
        const balanced = isBalancedAxis(r);

        return (
          <div className="pair-bar" key={axis.axis}>
            <div className="cat">
              <span>{axis.label}</span>
              {balanced && <span>균형 지점</span>}
            </div>

            <div className="labels">
              <span className="side">
                <span className="name">{r.pole1}</span>
                <span className="val num">{r.pole1Score}</span>
              </span>
              <span className="side">
                <span className="val num">{r.pole0Score}</span>
                <span className="name">{r.pole0}</span>
              </span>
            </div>

            <div
              className="pair-track"
              role="img"
              aria-label={
                balanced
                  ? `${axis.label}축: ${gwa(r.pole1)} ${r.pole0}를 비슷하게 쓰는 균형 지점 (50 대 50)`
                  : `${axis.label}축: ${r.pole1} ${r.pole1Score}, ${r.pole0} ${r.pole0Score}`
              }
            >
              <span className="pair-mid" aria-hidden="true" />
              <span
                className="pair-node"
                aria-hidden="true"
                style={{ left: `${100 - r.pole1Score}%` }}
              />
            </div>

            {balanced && (
              <p className="pair-note">
                이 축에서는 {gwa(r.pole1)} {r.pole0} 두 에너지를 비슷하게 쓰고
                있습니다.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
