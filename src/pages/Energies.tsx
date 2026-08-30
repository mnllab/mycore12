import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/useI18n";
import { PUBLIC_CONTENT } from "../i18n/publicContent";
import { ArrowRight } from "../components/icons";
import { ENERGY_RING_ORDER } from "../lib/mycore12";

/** 내부 한국어 에너지 key — 색 토큰과 오늘의 문장 조회에만 쓴다 */
const KO_ENERGY_BY_INDEX = ENERGY_RING_ORDER;

export default function Energies() {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const c = PUBLIC_CONTENT[locale].energies;
  const notes = c.notes as Record<string, string>;

  /** 축 순서(행동→운영)에 맞춘 내부 key 쌍 — 색과 노트 조회용 */
  const koPairs: [string, string][] = [
    [KO_ENERGY_BY_INDEX[0], KO_ENERGY_BY_INDEX[6]],
    [KO_ENERGY_BY_INDEX[1], KO_ENERGY_BY_INDEX[7]],
    [KO_ENERGY_BY_INDEX[2], KO_ENERGY_BY_INDEX[8]],
    [KO_ENERGY_BY_INDEX[3], KO_ENERGY_BY_INDEX[9]],
    [KO_ENERGY_BY_INDEX[4], KO_ENERGY_BY_INDEX[10]],
    [KO_ENERGY_BY_INDEX[5], KO_ENERGY_BY_INDEX[11]]
  ];

  return (
    <main className="page-enter content-page">
      <div className="shell content-hero">
        <h1>{c.title}</h1>
        <p className="lede">{c.lede}</p>
        <p className="note-inline">{c.noteDisclaimer}</p>
      </div>

      {c.axes.map((axis, i) => {
        const [koA, koB] = koPairs[i];
        return (
          <section className="content-section axis-section" key={axis.axis}>
            <div className="shell shell-wide">
              <div className="axis-head">
                <h2>
                  {axis.axis} — {axis.pair}
                </h2>
                <p className="axis-question">{axis.question}</p>
              </div>

              <div className="axis-grid">
                {[
                  { e: axis.a, ko: koA },
                  { e: axis.b, ko: koB }
                ].map(({ e, ko }) => (
                  <div className="energy-card" key={e.name}>
                    <div className="energy-name">
                      <span
                        className="energy-dot"
                        style={{ background: `var(--energy-${ko})` }}
                        aria-hidden="true"
                      />
                      <b>{e.name}</b>
                    </div>
                    <p>{e.definition}</p>
                    <p className="energy-useful">
                      <span className="energy-useful-label">{c.usefulLabel}</span>
                      {e.useful}
                    </p>
                    <p className="energy-note">
                      <span className="energy-note-label">{c.noteLabel}</span>
                      {notes[ko]}
                    </p>
                  </div>
                ))}
              </div>

              <p className="axis-together">
                <span className="axis-together-label">{c.togetherLabel}</span>
                {axis.together}
              </p>
            </div>
          </section>
        );
      })}

      <section className="content-section band">
        <div className="shell">
          <h2>{c.closingTitle}</h2>
          <p className="content-prose">{c.closingBody}</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 22 }}
            onClick={() => navigate("/assessment")}
          >
            {c.cta}
            <ArrowRight />
          </button>
        </div>
      </section>
    </main>
  );
}
