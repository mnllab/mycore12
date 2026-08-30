import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/useI18n";
import { PUBLIC_CONTENT, STORIES } from "../i18n/publicContent";
import { getLatestResult } from "../lib/storage";
import { ArrowRight } from "../components/icons";

/** Guide 하단 관련 글 — Article 04 + 08 */
const RELATED = ["use-strengths-wider", "one-small-step"];

export default function Guide() {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const c = PUBLIC_CONTENT[locale].guide;
  const stories = STORIES[locale];
  // 저장된 결과가 있으면 그 결과로, 없으면 검사 시작으로 자연스럽게 대체한다
  const latest = getLatestResult();

  return (
    <main className="page-enter content-page">
      <div className="shell content-hero">
        <h1>{c.title}</h1>
        <p className="lede">{c.lede}</p>
      </div>

      <section className="content-section">
        <div className="shell">
          <ol className="guide-steps">
            {c.steps.map((s, i) => (
              <li className="guide-step" key={s.title}>
                <span className="guide-num num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="guide-copy">
                  <h2>{s.title}</h2>
                  {s.body.map(p => (
                    <p key={p.slice(0, 24)}>{p}</p>
                  ))}
                  {s.items.length > 0 && (
                    <ul className="content-list">
                      {s.items.map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="content-section band">
        <div className="shell">
          <h2>{c.teamTitle}</h2>
          <div className="content-prose">
            {c.teamBody.map(p => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="shell">
          <h2>{c.questionsTitle}</h2>
          <div className="quotes">
            {c.questions.map(q => (
              <p className="quote" key={q}>
                {q}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="shell">
          <h2>{stories.labels.related}</h2>
          <div className="story-mini-list">
            {RELATED.map(slug => {
              const a = stories.articles.find(x => x.slug === slug);
              if (!a) return null;
              return (
                <Link className="story-mini" to={`/stories/${a.slug}`} key={a.slug}>
                  <b>{a.title}</b>
                  <span>{a.deck}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="content-section band">
        <div className="shell">
          <h2>{c.ctaTitle}</h2>
          <div className="hero-ctas" style={{ marginTop: 22 }}>
            {latest ? (
              <>
                <Link className="btn btn-primary" to={`/result/${latest.sessionId}`}>
                  {c.ctaPrimary}
                  <ArrowRight />
                </Link>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate("/assessment")}
                >
                  {c.ctaSecondary}
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => navigate("/assessment")}>
                {c.ctaSecondary}
                <ArrowRight />
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
