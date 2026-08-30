import { Link, useParams } from "react-router-dom";
import { useI18n } from "../i18n/useI18n";
import { findStory, STORIES } from "../i18n/publicContent";
import { getLatestResult } from "../lib/storage";
import { ArrowLeft, ArrowRight, MessageCircle } from "../components/icons";

export default function Story() {
  const { slug } = useParams();
  const { locale } = useI18n();
  const s = STORIES[locale];
  const cats = s.categories as Record<string, string>;
  const article = slug ? findStory(slug, locale) : undefined;
  const latest = getLatestResult();

  if (!article) {
    return (
      <main className="page-enter content-page">
        <div className="shell content-hero">
          <h1>{s.hub.title}</h1>
          <p className="lede">{s.hub.lede}</p>
          <Link className="btn btn-primary" to="/stories">
            {s.labels.backToList}
          </Link>
        </div>
      </main>
    );
  }

  // 같은 카테고리를 우선하되, 부족하면 목록 순서로 채운다 (고정 규칙, 채점과 무관)
  const related = [
    ...s.articles.filter(a => a.slug !== article.slug && a.category === article.category),
    ...s.articles.filter(a => a.slug !== article.slug && a.category !== article.category)
  ].slice(0, 2);

  return (
    <main className="page-enter content-page">
      <article className="shell story-article">
        <Link className="btn-text story-back" to="/stories">
          <ArrowLeft />
          {s.labels.backToList}
        </Link>

        <span className="story-cat">{cats[article.category]}</span>
        <h1>{article.title}</h1>
        <p className="story-deck-lead">{article.deck}</p>

        <div className="story-body">
          {article.body.map(p => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>

        <div className="story-reflection">
          <span className="story-reflection-label">
            <MessageCircle size={16} />
            {s.labels.reflection}
          </span>
          <p>{article.reflection}</p>
        </div>
      </article>

      <section className="content-section">
        <div className="shell">
          <h2>{s.labels.related}</h2>
          <div className="story-mini-list">
            {related.map(a => (
              <Link className="story-mini" to={`/stories/${a.slug}`} key={a.slug}>
                <b>{a.title}</b>
                <span>{a.deck}</span>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 30 }}>
            {latest ? (
              <Link className="btn btn-secondary" to={`/result/${latest.sessionId}`}>
                {s.hub.ctaButton}
                <ArrowRight />
              </Link>
            ) : (
              <Link className="btn btn-secondary" to="/assessment">
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
