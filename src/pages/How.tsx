import { Link, useNavigate } from "react-router-dom";
import { ListChecks, Scale, Layers, ArrowRight } from "../components/icons";
import { useI18n } from "../i18n/useI18n";
import { PUBLIC_CONTENT } from "../i18n/publicContent";

const STEP_ICONS = [ListChecks, Scale, Layers];

export default function How() {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const c = PUBLIC_CONTENT[locale].how;

  return (
    <main className="page-enter content-page">
      <div className="shell content-hero">
        <h1>{c.title}</h1>
        <p className="lede">{c.lede}</p>
      </div>

      <section className="content-section">
        <div className="shell">
          <h2>{c.stepsTitle}</h2>
          <div className="steps">
            {c.steps.map((s, i) => {
              const Icon = STEP_ICONS[i] ?? ListChecks;
              return (
                <div className="step" key={s.title}>
                  <span className="idx">
                    <Icon />
                    STEP {String(i + 1).padStart(2, "0")}
                  </span>
                  {/* 제목과 본문을 한 칸으로 묶는다.
                      (h2·p 를 grid 의 직접 자식으로 두면 본문이 좁은 첫 열로 떨어진다) */}
                  <div className="step-copy">
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="content-section band">
        <div className="shell">
          <h2>{c.axesTitle}</h2>
          <ul className="content-list">
            {c.axesItems.map(i => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <Link className="hero-link" to="/energies" style={{ marginTop: 20 }}>
            {c.axesLink}
            <ArrowRight />
          </Link>
        </div>
      </section>

      <section className="content-section">
        <div className="shell">
          <h2>{c.scoringTitle}</h2>
          <p className="content-prose">{c.scoringIntro}</p>
          <ul className="scoring-rows num">
            {c.scoringRows.map(r => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="content-prose">{c.scoringBody}</p>
          <div className="note-block" style={{ marginTop: 26 }}>
            <h3>{c.exampleTitle}</h3>
            <p>{c.exampleBody}</p>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="shell">
          <h2>{c.combinationsTitle}</h2>
          <div className="content-prose">
            {c.combinationsBody.map(p => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section band">
        <div className="shell shell-wide">
          <h2>{c.lengthsTitle}</h2>
          <div className="length-info-grid">
            {c.lengths.map(l => (
              <div className="length-info" key={l.title}>
                <b>{l.title}</b>
                <p>{l.body}</p>
              </div>
            ))}
          </div>
          <p className="note-inline" style={{ marginTop: 20 }}>
            {c.lengthsNote}
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="shell">
          <h2>{c.readingTitle}</h2>
          <ul className="content-list">
            {c.readingItems.map(i => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="content-section">
        <div className="shell">
          <div className="note-block">
            <h2>{c.validationTitle}</h2>
            {c.validationBody.map(p => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 30 }}
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

export function Privacy() {
  const { t } = useI18n();
  return (
    <main className="page-enter shell static-page">
      <h1>{t.privacy.title}</h1>
      <div className="prose">
        <p>{t.privacy.p1}</p>
        <p>{t.privacy.p2}</p>
        <p>{t.privacy.p3}</p>
      </div>

      {/* 광고·쿠키 안내 — AdSense 광고가 활성화될 경우를 위한 사전 안내 */}
      <h2 style={{ marginTop: 40, marginBottom: 14, fontSize: 18 }}>
        {t.privacy.adsTitle}
      </h2>
      <div className="prose">
        <p>{t.privacy.p4}</p>
        <p>{t.privacy.p5}</p>
        <p>{t.privacy.p6}</p>
        <p>
          <a
            href="https://policies.google.com/technologies/partner-sites"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.privacy.linkPartnerSites}
          </a>
          {" · "}
          <a
            href="https://myadcenter.google.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.privacy.linkAdCenter}
          </a>
        </p>
      </div>
    </main>
  );
}
