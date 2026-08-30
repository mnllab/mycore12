import { Link } from "react-router-dom";
import { useI18n } from "../i18n/useI18n";
import { STORIES } from "../i18n/publicContent";
import { getLatestResult } from "../lib/storage";
import { ArrowRight } from "../components/icons";

export default function Stories() {
  const { locale } = useI18n();
  const s = STORIES[locale];
  const cats = s.categories as Record<string, string>;
  const [featured, ...rest] = s.articles;
  const latest = getLatestResult();

  return (
    <main className="page-enter content-page">
      <div className="shell content-hero">
        <p className="eyebrow-text">{s.hub.eyebrow}</p>
        <h1>{s.hub.title}</h1>
        <p className="lede">{s.hub.lede}</p>
        <p className="note-inline">{s.hub.introNote}</p>
      </div>

      <section className="content-section">
        <div className="shell shell-wide">
          <h2>{s.hub.featuredTitle}</h2>
          <Link className="story-featured" to={`/stories/${featured.slug}`}>
            <span className="story-cat">{cats[featured.category]}</span>
            <b>{featured.title}</b>
            <span className="story-deck">{featured.deck}</span>
            <span className="story-more">
              {s.labels.backToList === "All Stories" ? "Read" : "읽기"}
              <ArrowRight size={15} />
            </span>
          </Link>
        </div>
      </section>

      <section className="content-section">
        <div className="shell shell-wide">
          <h2>{s.hub.allTitle}</h2>
          <div className="story-grid">
            {rest.map(a => (
              <Link className="story-card" to={`/stories/${a.slug}`} key={a.slug}>
                <span className="story-cat">{cats[a.category]}</span>
                <b>{a.title}</b>
                <span className="story-deck">{a.deck}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section band">
        <div className="shell">
          <h2>{s.hub.ctaTitle}</h2>
          <p className="content-prose">{s.hub.ctaBody}</p>
          <div style={{ marginTop: 22 }}>
            {latest ? (
              <Link className="btn btn-primary" to={`/result/${latest.sessionId}`}>
                {s.hub.ctaButton}
                <ArrowRight />
              </Link>
            ) : (
              <Link className="btn btn-primary" to="/assessment">
                {s.hub.ctaStart}
                <ArrowRight />
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
