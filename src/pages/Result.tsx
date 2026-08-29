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
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fresh = Boolean((location.state as { fresh?: boolean } | null)?.fresh);

  const stored = sessionId ? getResult(sessionId) : null;

  // 유형 매칭 실패는 데이터 오류이므로 콘솔에 남기되, 화면은 안내로 대체한다
  const { matched, matchError } = useMemo(() => {
    if (!stored) return { matched: null as ProfileType | null, matchError: false };
    try {
      return { matched: matchType(stored.code), matchError: false };
    } catch (e) {
      console.error(e);
      return { matched: null as ProfileType | null, matchError: true };
    }
  }, [stored?.code]);

  if (!stored || !matched) {
    return (
      <main className="page-enter shell static-page">
        <h1>{matchError ? "결과를 표시할 수 없어요" : "결과를 찾을 수 없어요"}</h1>
        <p className="lede">
          {matchError
            ? "저장된 결과가 현재 유형 데이터와 맞지 않습니다. 새 검사를 진행하면 정상적으로 결과를 확인할 수 있습니다."
            : "이 기기에 저장된 해당 결과가 없습니다. 새 검사를 시작해 보세요."}
        </p>
        <Link className="btn btn-primary" to="/assessment">
          마이코어12 시작하기
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

  // overview를 두 문단으로 분할: [행동·강점 서술] / [에너지 조합 설명과 성장 방향]
  const sigIdx = matched.overview.indexOf("이런 모습을 만드는");
  const overviewLead = sigIdx > 0 ? matched.overview.slice(0, sigIdx).trim() : matched.overview;
  const overviewRest = sigIdx > 0 ? matched.overview.slice(sigIdx).trim() : "";
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
  const toSentences = (s: string) =>
    s.split(/(?<=[.?])\s+/).map(x => x.trim()).filter(Boolean);
  const strengthSentences = new Set(matched.strengths.flatMap(toSentences));
  const dropSeen = (text: string) =>
    toSentences(text).filter(s => !strengthSentences.has(s)).join(" ");

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
  const roadmapSentences = new Set(
    Object.values(matched.developmentRoadmap).flatMap(v => toSentences(v as string))
  );
  const recoveryShown = matched.recoveryStrategies.map(s =>
    toSentences(s).filter(x => !roadmapSentences.has(x)).join(" ")
  );

  const startRetest = () => {
    clearActiveSession();
    navigate("/assessment");
  };

  const removeThis = () => {
    if (window.confirm("이 결과를 삭제할까요?")) {
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
              {BRAND.nameKo} 결과
            </p>
            <h1>{matched.personaName}</h1>
            <p className="headline">{matched.headline}</p>

            {/* energySignature — 축 라벨과 함께 읽는 6칸 서명 */}
            <div className="signature">
              {matched.axisPreferences.map((ap, i) => (
                <div className="sig" key={ap.axisLabel}>
                  <span className="axis">{AXES[i].label}</span>
                  <span className="energy">{ap.preferredEnergy}</span>
                </div>
              ))}
            </div>
            <p className="sig-string num">{matched.energySignature}</p>
          </div>
        </div>
      </section>

      {/* 결과 목차 (데스크톱) */}
      <div className="shell shell-wide">
        <nav className="result-index" aria-label="결과 목차">
          <a href="#core">핵심 특징</a>
          <a href="#energy">12가지 에너지</a>
          <a href="#strengths">잘하는 것</a>
          <a href="#work">일할 때</a>
          <a href="#judgment">판단할 때</a>
          <a href="#people">사람들과 함께할 때</a>
          <a href="#signals">강점이 너무 앞설 때</a>
          <a href="#wider">나를 더 넓게 쓰는 방법</a>
          <a href="#roadmap">성장 로드맵</a>
          <a href="#pressure">스트레스와 회복</a>
          <a href="#questions">질문</a>
        </nav>
      </div>

      {/* ── 02 나의 핵심 특징 — overview 전문 (editorial prose) ── */}
      <section className="section" id="core">
        <div className="shell shell-wide">
          <Eyebrow icon={FileText}>나의 핵심 특징</Eyebrow>
          <p className="prose">{overviewLeadShown}</p>
          {overviewRest && <p className="prose">{overviewRest}</p>}
        </div>
      </section>

      {/* ── 03 나의 12가지 에너지 — 지도 + 여섯 쌍 균형 bar ── */}
      <section className="section band" id="energy">
        <div className="shell shell-wide">
          <Eyebrow icon={Compass}>나의 12가지 에너지</Eyebrow>
          <h2>여섯 쌍의 에너지가 어디에 놓여 있는지</h2>
          <p className="sub">
            각 축에서 두 에너지의 합은 언제나 100입니다. 어느 쪽도 우열이 아니라,
            평소 더 자연스럽게 선택하는 방향을 보여줍니다.
          </p>
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
          <Eyebrow icon={Sparkles}>내가 자연스럽게 잘하는 것</Eyebrow>
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
          <Eyebrow icon={Briefcase}>일할 때의 나</Eyebrow>
          <div className="split-edit">
            <div className="col">
              <h3>일하는 방식</h3>
              <p>{matched.workStyle}</p>
            </div>
            <div className="col">
              <h3>강점이 잘 살아나는 상황</h3>
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
          <Eyebrow icon={Scale}>판단할 때의 나</Eyebrow>
          <p className="prose">{matched.decisionStyle}</p>
        </div>
      </section>

      {/* ── 07 사람들과 함께할 때 ─────────────────────── */}
      <section className="section band" id="people">
        <div className="shell shell-wide">
          <Eyebrow icon={Users}>사람들과 함께할 때</Eyebrow>
          <p className="prose" style={{ marginBottom: 34 }}>{matched.relationshipStyle}</p>
          <div className="split-edit">
            <div className="col">
              <h3>이럴 때 잘 작동합니다</h3>
              <ul>
                {matched.collaborationGuide.worksWellWhen.map(s => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="col">
              <h3>함께 살펴볼 장면</h3>
              <ul>
                {matched.collaborationGuide.mayStruggleWhen.map(s => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <h3 style={{ marginTop: 26 }}>나에게 맞는 피드백</h3>
              <p>{matched.collaborationGuide.bestFeedbackStyle}</p>
            </div>
          </div>
          <div className="team-highlight">
            <h3>함께할 때 더해지는 힘</h3>
            <p>{teamContributionShown}</p>
          </div>
        </div>
      </section>

      {/* ── 08 강점이 너무 앞설 때 (경고가 아닌 신호) ─── */}
      <section className="section" id="signals">
        <div className="shell shell-wide">
          <Eyebrow icon={ListChecks}>강점이 너무 앞설 때</Eyebrow>
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
          <Eyebrow icon={Layers}>나를 더 넓게 쓰는 방법</Eyebrow>
          <h2>여섯 쌍을 함께 쓰는 연습</h2>
          <p className="sub">
            보완 에너지는 부족한 점이 아니라 현재의 강점을 받쳐주는 확장
            자원입니다. 각 항목을 펼치면 연습 방법을 볼 수 있습니다.
          </p>
          <div className="accordion">
            {matched.developmentGuide.map((g, i) => (
              <details className="acc-item" key={`${g.primaryEnergy}-${g.supportEnergy}`} open={i === 0}>
                <summary>
                  <span className="pairline">
                    <span>{g.primaryEnergy}</span>
                    <span className="plus" aria-hidden="true">
                      +
                    </span>
                    <span>{g.supportEnergy}</span>
                  </span>
                  <span className="why">{g.matureStrength}</span>
                </summary>
                <div className="step-flow">
                  <div className="step">
                    <b>{g.supportEnergy} 에너지를 더하면</b>
                    <p>{g.whyItHelps}</p>
                  </div>
                  <div className="step">
                    <b>살펴볼 신호</b>
                    <p>{g.overuseSignal}</p>
                  </div>
                  <div className="step">
                    <b>실제로 할 수 있는 행동</b>
                    <p>{g.practice}</p>
                  </div>
                  <div className="step">
                    <b>성숙한 모습</b>
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
          <Eyebrow icon={TrendingUp}>나의 성장 로드맵</Eyebrow>
          <div className="roadmap" style={{ marginTop: 8 }}>
            <div className="roadmap-step">
              <b>지금 시작할 것</b>
              <p>{matched.developmentRoadmap.startNow}</p>
            </div>
            <div className="roadmap-step">
              <b>한 달 동안 연습할 것</b>
              <p>{matched.developmentRoadmap.next30Days}</p>
            </div>
            <div className="roadmap-step">
              <b>조금 더 길게 가져갈 방향</b>
              <p>{matched.developmentRoadmap.longTerm}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 11 스트레스를 받을 때 · 다시 균형을 찾는 방법 ── */}
      <section className="section band" id="pressure">
        <div className="shell shell-wide">
          <Eyebrow icon={RefreshCw}>스트레스를 받을 때</Eyebrow>
          <div className="split-edit">
            <div className="col">
              <h3>나타날 수 있는 신호</h3>
              <ul>
                {matched.stressSignals.map(s => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="col">
              <h3>다시 균형을 찾는 방법</h3>
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
          <Eyebrow icon={MessageCircle}>나에게 던져볼 질문</Eyebrow>
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
          <Eyebrow icon={Clock}>마무리</Eyebrow>
          <p className="encourage">{matched.encouragement}</p>

          <p className="note" style={{ marginTop: 34 }}>
            {publicInterpretationNote(matched.interpretationNote)}
          </p>
          <p className="note" style={{ marginTop: 10 }}>
            이 결과는 능력의 총량이나 사람 사이의 순서를 뜻하지 않으며, 임상적
            판단 도구가 아닌 자기이해를 돕는 성향 프로파일입니다. 문항은 내용
            감수를 마쳤고 실제 표본 기반 심리측정 검증은 진행 예정입니다.
          </p>

          <div className="result-actions">
            <button className="btn btn-primary" onClick={startRetest}>
              다시 검사하기
            </button>
            <Link className="btn btn-secondary" to="/history">
              내 기록 보기
            </Link>
            <button className="btn-text" onClick={removeThis}>
              이 결과 삭제
            </button>
          </div>

          <div className="meta-line num">
            <span>검사일 {new Date(stored.completedAt).toLocaleString("ko-KR")}</span>
            <span>
              {stored.assessmentLength ?? 36}문항
              {(stored.assessmentLength ?? 36) === 36 ? " 표준 검사" : ""}
            </span>
            <span>문항은행 {stored.bankVersion}</span>
            <span>유형 데이터 v{stored.typeDatasetVersion}</span>
          </div>
          <p className="note" style={{ marginTop: 18 }}>
            {BRAND.copyright} {BRAND.copyrightKo}
          </p>
        </div>
      </section>
    </main>
  );
}
