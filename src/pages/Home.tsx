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
import { getActiveSession, getLatestResult } from "../lib/storage";
import { useI18n } from "../i18n/useI18n";
import { localizedTypeByCode } from "../i18n/content";

export default function Home() {
  const navigate = useNavigate();
  const { locale, t, fill } = useI18n();
  const activeSession = getActiveSession();
  const latest = getLatestResult();
  // 저장된 typePersonaName(저장 시점 한국어)이 아니라 code 로 현재 유형을 찾아 표시한다
  const latestType = latest ? localizedTypeByCode(latest.code, locale) : null;
  // 진행 중인 검사가 있으면 그 세션의 길이가 유지된다 (중간에 바뀌지 않는다)
  const [length, setLength] = useState<AssessmentLength>(
    activeSession?.assessmentLength ?? DEFAULT_ASSESSMENT_LENGTH
  );

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
              <Link className="btn btn-secondary" to="/how">
                {t.home.howButton}
              </Link>
            </div>

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
    </main>
  );
}
