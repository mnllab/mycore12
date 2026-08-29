import { useNavigate } from "react-router-dom";
import { ListChecks, Scale, Layers } from "../components/icons";
import { useI18n } from "../i18n/useI18n";

const STEP_ICONS = [ListChecks, Scale, Layers];

export default function How() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <main className="page-enter shell static-page">
      <h1>{t.how.title}</h1>
      <p className="lede">{t.how.lede}</p>

      <div className="steps">
        {t.how.steps.map((s, i) => {
          const Icon = STEP_ICONS[i];
          return (
            <div className="step" key={s.title}>
              <span className="idx">
                <Icon />
                STEP {String(i + 1).padStart(2, "0")}
              </span>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 40 }}>
        <button className="btn btn-primary" onClick={() => navigate("/assessment")}>
          {t.how.start}
        </button>
      </div>

      <div className="prose" style={{ marginTop: 46 }}>
        <p>{t.how.principle}</p>
      </div>
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
