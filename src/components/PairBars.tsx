import { AXES, isBalancedAxis, type ScoreResult } from "../lib/mycore12";
import { useI18n } from "../i18n/useI18n";
import { joinPair } from "../i18n/formatters";

/**
 * 6개 양방향 pair balance bar.
 * `추진 68 ──●── 숙고 32` — 양쪽 값을 같은 크기·굵기로 병기하고,
 * 중앙선과 단일 node로만 위치를 표현한다. 강함/약함 라벨을 쓰지 않는다.
 *
 * 내부 pole1 / pole0 key 는 한국어 원본 그대로 두고, 표시명만 locale 로 바꾼다.
 * 한국어 조사 처리는 i18n/formatters 의 ko 전용 helper 로 분리했다.
 */
export default function PairBars({ result }: { result: ScoreResult }) {
  const { locale, t, fill, energy, axis: axisName } = useI18n();

  return (
    <div className="pair-bars">
      {AXES.map(axis => {
        const r = result.axisResults[axis.axis];
        const balanced = isBalancedAxis(r);

        const axisLabel = axisName(axis.axis);
        const pole1 = energy(r.pole1);
        const pole0 = energy(r.pole0);
        const pair = joinPair(pole1, pole0, locale);

        return (
          <div className="pair-bar" key={axis.axis}>
            <div className="cat">
              <span>{axisLabel}</span>
              {balanced && <span>{t.result.balanced}</span>}
            </div>

            <div className="labels">
              <span className="side">
                <span className="name">{pole1}</span>
                <span className="val num">{r.pole1Score}</span>
              </span>
              <span className="side">
                <span className="val num">{r.pole0Score}</span>
                <span className="name">{pole0}</span>
              </span>
            </div>

            <div
              className="pair-track"
              role="img"
              aria-label={
                balanced
                  ? fill(t.result.balancedAria, { axis: axisLabel, pair })
                  : fill(t.result.axisAria, {
                      axis: axisLabel,
                      pole1,
                      score1: r.pole1Score,
                      pole0,
                      score0: r.pole0Score
                    })
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
                {fill(t.result.balancedNote, { pair })}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
