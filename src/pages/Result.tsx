import { useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import EnergyMap from "../components/EnergyMap";
import PairBars from "../components/PairBars";
import {
  AXES,
  BRAND,
  matchType,
  publicInterpretationNote,
  type ProfileType,
  type ScoreResult
} from "../lib/mycore12";
import { clearActiveSession, deleteResult, getResult } from "../lib/storage";
import {
  Briefcase, Clock, Compass, FileText, Layers, ListChecks, MessageCircle,
  RefreshCw, Scale, Sparkles, TrendingUp, Users
} from "../components/icons";
import { useI18n } from "../i18n/useI18n";
import { localizeType } from "../i18n/content";
import { dropSentences, sentenceSet, splitOverview } from "../i18n/display";

/** 섹션 라벨 — 단일 라인 아이콘 + 짧은 라벨 */
function Eyebrow({
  icon: Icon,
  children
}: {
  icon: (p: { size?: number }) => JSX.Element;
  children: React.ReactNode;
}) {
  return (
    <p className="eyebrow">
      <Icon />
      <span>{children}</span>
    </p>
  );
}

export default function Result() {
  const { locale, t, fill, formatDateTime, energy, axis } = useI18n();
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fresh = Boolean((location.state as { fresh?: boolean } | null)?.fresh);

  const stored = sessionId ? getResult(sessionId) : null;

  // 유형 매칭 실패는 데이터 오류이므로 콘솔에 남기되, 화면은 안내로 대체한다
  const { matched, matchError } = useMemo(() => {
    if (!stored) return { matched: null as ProfileType | null, matchError: false };
    try {
      return {
        matched: localizeType(matchType(stored.code), locale),
        matchError: false
      };
    } catch (e) {
      console.error(e);
      return { matched: null as ProfileType | null, matchError: true };
    }
  }, [stored?.code, locale]);

  if (!stored || !matched) {
    return (
      <main className="page-enter shell static-page">
        <h1>{matchError ? t.result.mismatchTitle : t.result.notFoundTitle}</h1>
        <p className="lede">
          {matchError ? t.result.mismatchBody : t.result.notFoundBody}
        </p>
        <Link className="btn btn-primary" to="/assessment">
          {t.result.start}
        </Link>
      </main>
    );
  }

  const scoreView: ScoreResult = {
    code: stored.code,
    bitString: "",
    preferredEnergies: stored.preferredEnergies,
    energyScores: stored.energyScores,
    axisResults: stored.axisResults
  };

  // overview 문단 분할 — 특정 언어의 문구가 아니라 personaName 이 소개되는
  // 문장을 기준으로 나눈다 (locale 중립, English 데이터에서도 안전하다)
  const { lead: overviewLead, rest: overviewRest } = splitOverview(
    matched.overview,
    matched.personaName
  );
  // 강점 항목: 첫 문장을 핵심 문장(lead)으로, 나머지를 설명으로 분리 표시
  const splitLead = (s: string): [string, string] => {
    const parts = s.split(/(?<=\.)\s+/);
    return [parts[0], parts.slice(1).join(" ")];
  };

  /**
   * 표시 단계 중복 정리.
   *
   * 데이터셋은 필드마다 완결된 설명을 담고 있어(Source of Truth) 같은 문장이
   * 여러 필드에 들어간다. 한 페이지에서 이어 읽으면 같은 문장을 두세 번 만나므로,
   * 데이터는 그대로 두고 화면에서만 앞서 나온 문장을 생략한다.
   */
  const strengthSentences = sentenceSet(matched.strengths);
  const dropSeen = (text: string) => dropSentences(text, strengthSentences);

  // 강점 섹션에 이미 나온 문장은 개요·팀 문단에서 생략한다
  const overviewLeadShown = dropSeen(overviewLead);
  const teamContributionShown = dropSeen(matched.teamContribution);
  // "함께 살펴볼 장면"에 이미 나온 항목은 "강점이 너무 앞설 때"에서 생략한다
  const struggleShown = new Set(matched.collaborationGuide.mayStruggleWhen);
  // 마지막 항목은 목록이 아니라 섹션 안내문이라 도입부로 올린다
  const cautionItems = matched.cautions.filter(c => !struggleShown.has(c));
  const cautionNote = cautionItems[cautionItems.length - 1] ?? "";
  const cautionList = cautionItems.slice(0, -1);
  // 성장 로드맵(앞 섹션)에 이미 나온 실천 문장은 회복 방법에서 생략한다
  const roadmapSentences = sentenceSet(
    Object.values(matched.developmentRoadmap) as string[]
  );
  const recoveryShown = matched.recoveryStrategies.map(s =>
    dropSentences(s, roadmapSentences)
  );

  const startRetest = () => {
    clearActiveSession();
    navigate("/assessment");
  };

  const removeThis = () => {
    if (window.confirm(t.result.deleteConfirm)) {
      deleteResult(stored.sessionId);
      navigate("/history");
    }
  };

  return (
    <main className="result-content page-enter">
      {/* ── 01 Result Hero — 이름·핵심 특징·에너지 서명 (5초 안에 파악) ── */}
      <section className="result-hero">
        <div className="shell shell-wide inner">
          <div className="hero-copy">
            <p className="label">
              <Compass size={17} />
              {t.result.resultLabel}
            </p>
            <h1>{matched.personaName}</h1>
            <p className="headline">{matched.headline}</p>

            {/* energySignature — 축 라벨과 함께 읽는 6칸 서명 */}
            <div className="signature">
              {matched.axisPreferences.map((ap, i) => (
                <div className="sig" key={ap.axisLabel}>
                  <span className="axis">{axis(AXES[i].axis)}</span>
                  <span className="energy">{energy(ap.preferredEnergy)}</span>
                </div>
              ))}
            </div>
            <p className="sig-string num">{matched.energySignature}</p>
          </div>
        </div>
      </section>

      {/* 결과 목차 (데스크톱) */}
      <div className="shell shell-wide">
        <nav className="result-index" aria-label={t.result.tocAria}>
          <a href="#core">{t.result.toc.core}</a>
          <a href="#energy">{t.result.toc.energy}</a>
          <a href="#strengths">{t.result.toc.strengths}</a>
          <a href="#work">{t.result.toc.work}</a>
          <a href="#judgment">{t.result.toc.judgment}</a>
          <a href="#people">{t.result.toc.people}</a>
          <a href="#signals">{t.result.toc.signals}</a>
          <a href="#wider">{t.result.toc.wider}</a>
          <a href="#roadmap">{t.result.toc.roadmap}</a>
          <a href="#pressure">{t.result.toc.pressure}</a>
          <a href="#questions">{t.result.toc.questions}</a>
        </nav>
      </div>

      {/* ── 02 나의 핵심 특징 — overview 전문 (editorial prose) ── */}
      <section className="section" id="core">
        <div className="shell shell-wide">
          <Eyebrow icon={FileText}>{t.result.core}</Eyebrow>
          <p className="prose">{overviewLeadShown}</p>
          {overviewRest && <p className="prose">{overviewRest}</p>}
        </div>
      </section>

      {/* ── 03 나의 12가지 에너지 — 지도 + 여섯 쌍 균형 bar ── */}
      <section className="section band" id="energy">
        <div className="shell shell-wide">
          <Eyebrow icon={Compass}>{t.result.energy}</Eyebrow>
          <h2>{t.result.energyTitle}</h2>
          <p className="sub">{t.result.energyHelp}</p>
          <div className="map-grid">
            <div className="map-panel">
              <EnergyMap energyScores={stored.energyScores} animate={fresh} />
            </div>
            <PairBars result={scoreView} />
          </div>
        </div>
      </section>

      {/* ── 04 내가 자연스럽게 잘하는 것 (핵심 문장 + 설명 블록) ── */}
      <section className="section" id="strengths">
        <div className="shell shell-wide">
          <Eyebrow icon={Sparkles}>{t.result.strengths}</Eyebrow>
          <div className="enum-list">
            {matched.strengths.map(s => {
              const [lead, more] = splitLead(s);
              return (
                <div className="enum-item" key={s}>
                  <p className="s-lead">
                    {lead}
                    {more && <>{" "}<span className="s-more">{more}</span></>}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 05 일할 때의 나 ───────────────────────────── */}
      <section className="section band" id="work">
        <div className="shell shell-wide">
          <Eyebrow icon={Briefcase}>{t.result.work}</Eyebrow>
          <div className="split-edit">
            <div className="col">
              <h3>{t.result.workStyle}</h3>
              <p>{matched.workStyle}</p>
            </div>
            <div className="col">
              <h3>{t.result.goodFit}</h3>
              <ul>
                {matched.goodFitSituations.map(s => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 06 판단할 때의 나 ─────────────────────────── */}
      <section className="section" id="judgment">
        <div className="shell shell-wide">
          <Eyebrow icon={Scale}>{t.result.judgment}</Eyebrow>
          <p className="prose">{matched.decisionStyle}</p>
        </div>
      </section>

      {/* ── 07 사람들과 함께할 때 ─────────────────────── */}
      <section className="section band" id="people">
        <div className="shell shell-wide">
          <Eyebrow icon={Users}>{t.result.people}</Eyebrow>
          <p className="prose" style={{ marginBottom: 34 }}>{matched.relationshipStyle}</p>
          <div className="split-edit">
            <div className="col">
              <h3>{t.result.worksWell}</h3>
              <ul>
                {matched.collaborationGuide.worksWellWhen.map(s => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="col">
              <h3>{t.result.watch}</h3>
              <ul>
                {matched.collaborationGuide.mayStruggleWhen.map(s => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <h3 style={{ marginTop: 26 }}>{t.result.feedback}</h3>
              <p>{matched.collaborationGuide.bestFeedbackStyle}</p>
            </div>
          </div>
          <div className="team-highlight">
            <h3>{t.result.team}</h3>
            <p>{teamContributionShown}</p>
          </div>
        </div>
      </section>

      {/* ── 08 강점이 너무 앞설 때 (경고가 아닌 신호) ─── */}
      <section className="section" id="signals">
        <div className="shell shell-wide">
          <Eyebrow icon={ListChecks}>{t.result.signals}</Eyebrow>
          <p className="sub">{cautionNote}</p>
          <div className="signal-list">
            {cautionList.map(cItem => (
              <div className="enum-item" key={cItem}>
                <p>{cItem}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 09 나를 더 넓게 쓰는 방법 (아코디언 + 단계 흐름) ── */}
      <section className="section band" id="wider">
        <div className="shell shell-wide">
          <Eyebrow icon={Layers}>{t.result.wider}</Eyebrow>
          <h2>{t.result.widerTitle}</h2>
          <p className="sub">{t.result.widerHelp}</p>
          <div className="accordion">
            {matched.developmentGuide.map((g, i) => (
              <details className="acc-item" key={`${g.primaryEnergy}-${g.supportEnergy}`} open={i === 0}>
                <summary>
                  <span className="pairline">
                    <span>{energy(g.primaryEnergy)}</span>
                    <span className="plus" aria-hidden="true">
                      +
                    </span>
                    <span>{energy(g.supportEnergy)}</span>
                  </span>
                  <span className="why">{g.matureStrength}</span>
                </summary>
                <div className="step-flow">
                  <div className="step">
                    <b>{fill(t.result.addEnergy, { energy: energy(g.supportEnergy) })}</b>
                    <p>{g.whyItHelps}</p>
                  </div>
                  <div className="step">
                    <b>{t.result.notice}</b>
                    <p>{g.overuseSignal}</p>
                  </div>
                  <div className="step">
                    <b>{t.result.practice}</b>
                    <p>{g.practice}</p>
                  </div>
                  <div className="step">
                    <b>{t.result.mature}</b>
                    <p>{g.matureStrength}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10 성장 로드맵 (3단계 timeline) ───────────── */}
      <section className="section" id="roadmap">
        <div className="shell shell-wide">
          <Eyebrow icon={TrendingUp}>{t.result.roadmap}</Eyebrow>
          <div className="roadmap" style={{ marginTop: 8 }}>
            <div className="roadmap-step">
              <b>{t.result.startNow}</b>
              <p>{matched.developmentRoadmap.startNow}</p>
            </div>
            <div className="roadmap-step">
              <b>{t.result.next30}</b>
              <p>{matched.developmentRoadmap.next30Days}</p>
            </div>
            <div className="roadmap-step">
              <b>{t.result.longTerm}</b>
              <p>{matched.developmentRoadmap.longTerm}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 11 스트레스를 받을 때 · 다시 균형을 찾는 방법 ── */}
      <section className="section band" id="pressure">
        <div className="shell shell-wide">
          <Eyebrow icon={RefreshCw}>{t.result.stress}</Eyebrow>
          <div className="split-edit">
            <div className="col">
              <h3>{t.result.stressSignals}</h3>
              <ul>
                {matched.stressSignals.map(s => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="col">
              <h3>{t.result.recovery}</h3>
              <ul>
                {recoveryShown.map(s => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 12 나에게 던져볼 질문 (조용한 editorial) ──── */}
      <section className="section" id="questions">
        <div className="shell shell-wide">
          <Eyebrow icon={MessageCircle}>{t.result.questions}</Eyebrow>
          <div className="quotes">
            {matched.selfCoachingQuestions.map(qz => (
              <p className="quote" key={qz}>
                {qz}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── 13 마무리 ─────────────────────────────────── */}
      <section className="section band">
        <div className="shell shell-wide">
          <Eyebrow icon={Clock}>{t.result.closing}</Eyebrow>
          <p className="encourage">{matched.encouragement}</p>

          <p className="note" style={{ marginTop: 34 }}>
            {publicInterpretationNote(matched.interpretationNote)}
          </p>
          <p className="note" style={{ marginTop: 10 }}>
            {t.result.validationNote}
          </p>

          <div className="result-actions">
            <button className="btn btn-primary" onClick={startRetest}>
              {t.result.retest}
            </button>
            <Link className="btn btn-secondary" to="/history">
              {t.result.history}
            </Link>
            <button className="btn-text" onClick={removeThis}>
              {t.result.delete}
            </button>
          </div>

          <div className="meta-line num">
            <span>
              {fill(t.result.date, { date: formatDateTime(stored.completedAt) })}
            </span>
            <span>
              {fill(t.result.questionCount, {
                count: stored.assessmentLength ?? 36
              })}
              {(stored.assessmentLength ?? 36) === 36 ? ` ${t.result.standard}` : ""}
            </span>
            <span>{fill(t.result.questionBank, { version: stored.bankVersion })}</span>
            <span>
              {fill(t.result.typeData, { version: stored.typeDatasetVersion })}
            </span>
          </div>
          <p className="note" style={{ marginTop: 18 }}>
            {BRAND.copyright}
            {locale === "ko" ? ` ${BRAND.copyrightKo}` : ""}
          </p>
        </div>
      </section>
    </main>
  );
}
