import { useI18n } from "../i18n/useI18n";
import { RELEASE_NOTES } from "../i18n/releaseNotes";

export default function Changelog() {
  const { locale, t } = useI18n();
  const notes = RELEASE_NOTES[locale];

  return (
    <main className="page-enter content-page">
      <div className="shell content-hero">
        <h1>{t.nav.updates}</h1>
      </div>

      <section className="content-section">
        <div className="shell">
          <ol className="changelog-list">
            {notes.map(n => (
              <li className="changelog-item" key={n.version}>
                <div className="changelog-meta">
                  <span className="changelog-version num">v{n.version}</span>
                  <span className="changelog-date num">{n.date}</span>
                </div>
                <p>{n.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
