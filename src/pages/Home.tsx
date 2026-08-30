import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import OrbitGraphic from "../components/OrbitGraphic";
import { BRAND } from "../lib/mycore12";
import { ArrowRight, Check } from "../components/icons";
import {
  DEFAULT_ASSESSMENT_LENGTH,
  LENGTH_OPTIONS,
  type AssessmentLength
} from "../lib/draw";
import {
  clearActiveSession,
  deleteAllLocalData,
  getActiveSession,
  getLatestResult
} from "../lib/storage";
import ResetDialog from "../components/ResetDialog";
import { useI18n } from "../i18n/useI18n";
import { HOME_TEASER_SLUGS, PUBLIC_CONTENT, STORIES } from "../i18n/publicContent";
import { localizedTypeByCode } from "../i18n/content";

export default function Home() {
  const navigate = useNavigate();
  const { locale, t, fill } = useI18n();
  const pub = PUBLIC_CONTENT[locale].home;
  const stories = STORIES[locale];
  const activeSession = getActiveSession();
  const latest = getLatestResult();
  // 저장된 typePersonaName(저장 시점 한국어)이 아니라 code 로 현재 유형을 찾아 표시한다
  const latestType = latest ? localizedTypeByCode(latest.code, locale) : null;
  // 진행 중인 검사가 있으면 그 세션의 길이가 유지된다 (중간에 바뀌지 않는다)
  const [length, setLength] = useState<AssessmentLength>(
    activeSession?.assessmentLength ?? DEFAULT_ASSESSMENT_LENGTH
  );

  /**
   * 진행 중인 검사를 버리고 처음부터 다시 시작한다.
   * 되돌릴 수 없는 동작이라 확인을 한 번 받고, 세션을 지운 뒤 검사 화면으로 간다.
   * (완료된 결과 기록은 건드리지 않는다)
   */
  const startOver = () => {
    if (!window.confirm(t.home.startOverConfirm)) return;
    clearActiveSession();
    navigate("/assessment", { state: { length: DEFAULT_ASSESSMENT_LENGTH } });
  };

  /**
   * 초기화 다이얼로그 — window.confirm 은 두 갈래뿐이라 별도 컴포넌트로
   * 세 갈래(전체 삭제 / 지금 것만 삭제 / 취소)를 구현했다.
   * 어떤 선택이든 다이얼로그를 닫고 나면 이 함수(Home)가 다시 렌더되면서
   * getActiveSession()/getLatestResult() 를 새로 읽으므로 화면이 최신 상태로
   * 갱신된다 — 별도의 refresh 상태를 두지 않아도 된다.
   */
  const [resetOpen, setResetOpen] = useState(false);
  const closeReset = () => setResetOpen(false);
  const resetAll = () => {
    deleteAllLocalData();
    setLength(DEFAULT_ASSESSMENT_LENGTH);
    setResetOpen(false);
  };
  const resetCurrentOnly = () => {
    clearActiveSession();
    setLength(DEFAULT_ASSESSMENT_LENGTH);
    setResetOpen(false);
  };

  return (
    <main className="page-enter">
      <section className="hero">
        <div className="shell inner">
          <div>
            {/* 브랜드 위계: 마이코어12 / MYCORE12 → 나를 이루는 12가지 에너지 → 6축 기반 성향 프로파일 */}
            <div className="brand-lockup">
              {locale === "ko" ? (
                <>
                  <h1>{BRAND.nameKo}</h1>
                  <p className="wordmark-en">{BRAND.nameEn}</p>
                </>
              ) : (
                <h1>{BRAND.nameEn}</h1>
              )}
              <p className="tagline">{t.brand.tagline}</p>
              <span className="descriptor">{t.brand.descriptor}</span>
            </div>

            <p className="lede">{t.home.lede}</p>

            {activeSession ? (
              <p className="length-resume">
                {fill(t.home.resume, { length: activeSession.assessmentLength })}
              </p>
            ) : (
              <div className="length-pick">
                <h2>{t.home.chooseLength}</h2>
                <p className="length-sub">{t.home.lengthHelp}</p>
                <div
                  className="length-grid"
                  role="radiogroup"
                  aria-label={t.home.lengthAria}
                >
                  {LENGTH_OPTIONS.map(opt => {
                    // 표시 문구만 locale 리소스에서 가져온다 (길이 값·추출 규칙은 그대로)
                    const copy = t.lengths[String(opt.length) as "18" | "36" | "54" | "72"];
                    return (
                    <button
                      key={opt.length}
                      type="button"
                      role="radio"
                      aria-checked={length === opt.length}
                      className={`length-card ${length === opt.length ? "on" : ""}`}
                      onClick={() => setLength(opt.length)}
                    >
                      <span className="length-head">
                        <b className="num">{copy.title}</b>
                        {opt.recommended && (
                          <span className="length-badge">{t.home.recommended}</span>
                        )}
                      </span>
                      <span className="length-tag">
                        {copy.tagline}
                        {length === opt.length && (
                          <Check className="length-check" size={15} />
                        )}
                      </span>
                      <span className="length-desc">{copy.description}</span>
                    </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="hero-ctas">
              <button
                className="btn btn-primary"
                onClick={() =>
                  navigate("/assessment", activeSession ? undefined : { state: { length } })
                }
              >
                {activeSession ? t.home.resumeButton : t.home.start}
              </button>
              {activeSession ? (
                <button className="btn btn-secondary" type="button" onClick={startOver}>
                  {t.home.startOver}
                </button>
              ) : (
                <Link className="btn btn-secondary" to="/how">
                  {t.home.howButton}
                </Link>
              )}
              {/* 첫 화면에도, 진행 중 화면에도 항상 노출되는 초기화 버튼 */}
              <button
                className="btn-text"
                type="button"
                onClick={() => setResetOpen(true)}
              >
                {t.home.resetButton}
              </button>
            </div>

            <ResetDialog
              open={resetOpen}
              hasActiveSession={!!activeSession}
              onYes={resetAll}
              onNo={resetCurrentOnly}
              onCancel={closeReset}
            />
            {activeSession && (
              <Link className="hero-link" to="/how">
                {t.home.howButton}
                <ArrowRight />
              </Link>
            )}

            {latest && latestType && (
              <Link className="hero-link" to={`/result/${latest.sessionId}`}>
                {fill(t.home.recentProfile, {
                  personaName: latestType.personaName
                })}
                <ArrowRight />
              </Link>
            )}
          </div>

          <div className="hero-orbit">
            <OrbitGraphic />
          </div>
        </div>
      </section>

      <div className="shell">
        <div className="info-strip">
          <div className="cell">
            <b className="num">{locale === "ko" ? `${length}개` : length}</b>
            <span>{t.home.infoQuestions}</span>
          </div>
          <div className="cell">
            <b className="num">{locale === "ko" ? "12가지" : 12}</b>
            <span>{t.home.infoEnergies}</span>
          </div>
          <div className="cell">
            <b className="num">{locale === "ko" ? "64개" : 64}</b>
            <span>{t.home.infoPatterns}</span>
          </div>
          <div className="cell">
            <b>{t.home.noRightAnswers}</b>
            <span>{t.home.equalValue}</span>
          </div>
        </div>
      </div>

      {/* ── 마이코어12 소개 티저 ─────────────────────── */}
      <section className="content-section">
        <div className="shell">
          <p className="eyebrow-text">{pub.about.eyebrow}</p>
          <h2>{pub.about.title}</h2>
          <div className="content-prose">
            <p>{pub.about.body1}</p>
            <p>{pub.about.body2}</p>
          </div>
          <ul className="content-list" style={{ marginTop: 20 }}>
            {pub.about.points.map(p => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <Link className="hero-link" to="/about" style={{ marginTop: 22 }}>
            {pub.about.link}
            <ArrowRight />
          </Link>
        </div>
      </section>

      {/* ── 여섯 쌍 티저 ─────────────────────────────── */}
      <section className="content-section band">
        <div className="shell shell-wide">
          <p className="eyebrow-text">{pub.pairs.eyebrow}</p>
          <h2>{pub.pairs.title}</h2>
          <p className="content-prose">{pub.pairs.intro}</p>
          <ul className="pair-rows" style={{ marginTop: 22 }}>
            {pub.pairs.items.map(p => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <Link className="hero-link" to="/energies" style={{ marginTop: 22 }}>
            {pub.pairs.link}
            <ArrowRight />
          </Link>
        </div>
      </section>

      {/* ── 결과 활용 티저 ───────────────────────────── */}
      <section className="content-section">
        <div className="shell shell-wide">
          <p className="eyebrow-text">{pub.usage.eyebrow}</p>
          <h2>{pub.usage.title}</h2>
          <div className="principle-cards" style={{ marginTop: 24 }}>
            {pub.usage.cards.map(c => (
              <div className="principle-card" key={c.title}>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
          <Link className="hero-link" to="/guide" style={{ marginTop: 22 }}>
            {pub.usage.link}
            <ArrowRight />
          </Link>
        </div>
      </section>

      {/* ── 읽을거리 티저 (Article 01 · 02 · 08) ────── */}
      <section className="content-section band">
        <div className="shell shell-wide">
          <p className="eyebrow-text">{pub.journal.eyebrow}</p>
          <h2>{pub.journal.title}</h2>
          <div className="story-grid" style={{ marginTop: 24 }}>
            {HOME_TEASER_SLUGS.map(slug => {
              const a = stories.articles.find(x => x.slug === slug);
              if (!a) return null;
              return (
                <Link className="story-card" to={`/stories/${a.slug}`} key={a.slug}>
                  <span className="story-cat">
                    {(stories.categories as Record<string, string>)[a.category]}
                  </span>
                  <b>{a.title}</b>
                  <span className="story-deck">{a.deck}</span>
                </Link>
              );
            })}
          </div>
          <Link className="hero-link" to="/stories" style={{ marginTop: 22 }}>
            {pub.journal.link}
            <ArrowRight />
          </Link>
        </div>
      </section>
    </main>
  );
}
