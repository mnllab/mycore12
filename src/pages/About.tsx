import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/useI18n";
import { PUBLIC_CONTENT, STORIES } from "../i18n/publicContent";
import { ArrowRight, Compass, FileText, Layers } from "../components/icons";

const EXPLORE_ICONS = [Compass, FileText, Layers];
/** About 하단 관련 글 — Article 01 + 03 */
const RELATED = ["strengths-already-here", "comparison-gets-loud"];

export default function About() {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const c = PUBLIC_CONTENT[locale].about;
  const stories = STORIES[locale];

  return (
    <main className="page-enter content-page">
      <div className="shell content-hero">
        <h1>{c.title}</h1>
        <p className="lede">{c.lede}</p>
      </div>

      <section className="content-section">
        <div className="shell">
          <h2>{c.whyTitle}</h2>
          <div className="content-prose">
            {c.whyBody.map(p => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section band">
        <div className="shell shell-wide">
          <h2>{c.principlesTitle}</h2>
          <div className="principle-cards">
            {c.principles.map(p => (
              <div className="principle-card" key={p.title}>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="shell">
          <h2>{c.resultTitle}</h2>
          <ul className="content-list">
            {c.resultItems.map(i => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="content-section">
        <div className="shell">
          <h2>{c.readTitle}</h2>
          <div className="content-prose">
            {c.readBody.map(p => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="shell">
          <h2>{c.scopeTitle}</h2>
          <div className="content-prose">
            {c.scopeBody.map(p => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="shell">
          <div className="note-block">
            <h2>{c.validationTitle}</h2>
            <p>{c.validationBody}</p>
          </div>
        </div>
      </section>

      <section className="content-section band">
        <div className="shell">
          <h2>{c.faqTitle}</h2>
          <div className="faq-list">
            {c.faq.map(f => (
              <details className="faq-item" key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="shell shell-wide">
          <h2>{c.exploreTitle}</h2>
          <div className="explore-cards">
            {c.explore.map((e, i) => {
              const Icon = EXPLORE_ICONS[i] ?? Compass;
              return (
                <Link className="explore-card" to={e.to} key={e.to}>
                  <span className="explore-icon">
                    <Icon size={18} />
                  </span>
                  <b>{e.title}</b>
                  <span className="explore-body">{e.body}</span>
                </Link>
              );
            })}
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
          <p className="content-prose">{c.ctaBody}</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 22 }}
            onClick={() => navigate("/assessment")}
          >
            {c.ctaButton}
            <ArrowRight />
          </button>
        </div>
      </section>
    </main>
  );
}
