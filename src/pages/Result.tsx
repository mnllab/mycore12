import { useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import EnergyMap from "../components/EnergyMap";
import PairBars from "../components/PairBars";
import {
  AXES,
  BRAND,
  PAIR_FAMILY,
  matchType,
  publicInterpretationNote,
  type ProfileType,
  type ScoreResult
} from "../lib/mycore12";
import { clearActiveSession, deleteResult, getResult } from "../lib/storage";

/** 섹션 라벨 — 반복 카드 대신 번호와 규칙선으로 리듬을 만든다 */
function Eyebrow({ idx, children }: { idx: string; children: React.ReactNode }) {
  return (
    <p className="eyebrow">
      <span className="idx">{idx}</span>
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

  const overviewExcerpt = matched.overview.split(". ").slice(0, 3).join(". ") + ".";

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
    <main className="page-enter">
      {/* ── Result Hero ───────────────────────────────── */}
      <section className="result-hero">
        <div className="shell inner">
          <div className="hero-copy">
            <p className="label">내가 발견한 {BRAND.nameKo} 패턴</p>
            <h1>{matched.personaName}</h1>
            <p className="headline">{matched.headline}</p>

            {/* energySignature — 축 라벨과 함께 읽는 6칸 서명 */}
            <div className="signature" aria-label={`에너지 서명: ${matched.energySignature}`}>
              {matched.axisPreferences.map((ap, i) => {
                const axis = AXES[i];
                const family = PAIR_FAMILY[axis.axis];
                return (
                  <div className="sig" key={ap.axisLabel}>
                    <span className="axis">{axis.label}</span>
                    <span className="energy">{ap.preferredEnergy}</span>
                    <span
                      className="stripe"
                      aria-hidden="true"
                      style={{ background: family.strong, opacity: 0.55 }}
                    />
                  </div>
                );
              })}
            </div>

            <p className="overview-x">{overviewExcerpt}</p>
          </div>

          <div className="map-panel">
            <EnergyMap energyScores={stored.energyScores} animate={fresh} />
          </div>
        </div>
      </section>

      {/* 결과 목차 (데스크톱) */}
      <div className="shell">
        <nav className="result-index" aria-label="결과 목차">
          <a href="#balance">에너지 균형</a>
          <a href="#strengths">자연스럽게 쓰는 힘</a>
          <a href="#work">일할 때</a>
          <a href="#people">사람들과 함께할 때</a>
          <a href="#signals">강점을 더 잘 쓰기 위한 신호</a>
          <a href="#wider">나를 더 넓게 쓰는 방법</a>
          <a href="#roadmap">성장 로드맵</a>
          <a href="#pressure">압박과 회복</a>
          <a href="#questions">나에게 던져볼 질문</a>
        </nav>
      </div>

      {/* ── 01 여섯 쌍의 균형 ─────────────────────────── */}
      <section className="section" id="balance">
        <div className="shell">
          <Eyebrow idx="01">에너지 균형</Eyebrow>
          <h2>여섯 쌍의 에너지가 어디에 놓여 있는지</h2>
          <p className="sub">
            각 축에서 두 에너지의 합은 언제나 100입니다. 어느 쪽도 우열이 아니라,
            평소 더 자연스럽게 선택하는 방향을 보여줍니다.
          </p>
          <PairBars result={scoreView} />
        </div>
      </section>

      {/* ── 02 강점 (번호 매긴 에디토리얼 리스트) ─────── */}
      <section className="section band" id="strengths">
        <div className="shell">
          <Eyebrow idx="02">내가 자연스럽게 쓰는 힘</Eyebrow>
          <h2>{matched.energySignature}</h2>
          <p className="sub">
            아래는 여섯 축의 선호가 실제 장면에서 어떻게 나타나는지를 정리한
            것입니다.
          </p>
          <div className="enum-list">
            {matched.strengths.map((s, i) => (
              <div className="enum-item" key={s}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <p>{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 03 일할 때 (split editorial) ───────────────── */}
      <section className="section" id="work">
        <div className="shell">
          <Eyebrow idx="03">일할 때의 나</Eyebrow>
          <div className="split-edit">
            <div className="col">
              <h3>일하는 방식</h3>
              <p>{matched.workStyle}</p>
            </div>
            <div className="col">
              <h3>판단하는 방식</h3>
              <p>{matched.decisionStyle}</p>
            </div>
            <div className="col">
              <h3>팀에 더하는 기여</h3>
              <p>{matched.teamContribution}</p>
            </div>
            <div className="col">
              <h3>잘 맞는 상황</h3>
              <ul>
                {matched.goodFitSituations.map(s => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 04 관계 ───────────────────────────────────── */}
      <section className="section band" id="people">
        <div className="shell">
          <Eyebrow idx="04">사람들과 함께할 때의 나</Eyebrow>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.85,
              maxWidth: "34em",
              marginBottom: 30
            }}
          >
            {matched.relationshipStyle}
          </p>
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
        </div>
      </section>

      {/* ── 05 신호 ───────────────────────────────────── */}
      <section className="section" id="signals">
        <div className="shell">
          <Eyebrow idx="05">강점을 더 잘 쓰기 위한 신호</Eyebrow>
          <p className="sub">
            아래 내용은 고쳐야 할 문제가 아니라, 자연스러운 강점의 사용 강도를
            조정할 시점을 알려주는 신호입니다.
          </p>
          <div className="enum-list">
            {matched.cautions.map((cItem, i) => (
              <div className="enum-item" key={cItem}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <p>{cItem}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 06 확장 (아코디언) ────────────────────────── */}
      <section className="section band" id="wider">
        <div className="shell">
          <Eyebrow idx="06">나를 더 넓게 쓰는 방법</Eyebrow>
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
                  <span className="why">{g.whyItHelps}</span>
                </summary>
                <div className="acc-body">
                  <div className="cell">
                    <b>왜 도움이 되나요</b>
                    {g.whyItHelps}
                  </div>
                  <div className="cell">
                    <b>살펴볼 신호</b>
                    {g.overuseSignal}
                  </div>
                  <div className="cell">
                    <b>작은 연습</b>
                    {g.practice}
                  </div>
                  <div className="cell">
                    <b>성숙한 모습</b>
                    {g.matureStrength}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── 07 로드맵 (타임라인) ──────────────────────── */}
      <section className="section" id="roadmap">
        <div className="shell">
          <Eyebrow idx="07">나의 성장 로드맵</Eyebrow>
          <div className="roadmap" style={{ marginTop: 8 }}>
            <div className="roadmap-step">
              <b>지금 바로</b>
              <p>{matched.developmentRoadmap.startNow}</p>
            </div>
            <div className="roadmap-step">
              <b>앞으로 30일</b>
              <p>{matched.developmentRoadmap.next30Days}</p>
            </div>
            <div className="roadmap-step">
              <b>길게 보며</b>
              <p>{matched.developmentRoadmap.longTerm}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 08 압박과 회복 ────────────────────────────── */}
      <section className="section band" id="pressure">
        <div className="shell">
          <Eyebrow idx="08">압박이 커질 때, 다시 균형을 찾는 방법</Eyebrow>
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
              <h3>균형을 되찾는 방법</h3>
              <ul>
                {matched.recoveryStrategies.map(s => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 09 자기 코칭 질문 ─────────────────────────── */}
      <section className="section" id="questions">
        <div className="shell">
          <Eyebrow idx="09">나에게 던져볼 질문</Eyebrow>
          <div className="quotes">
            {matched.selfCoachingQuestions.map(qz => (
              <p className="quote" key={qz}>
                {qz}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── 마무리 ────────────────────────────────────── */}
      <section className="section">
        <div className="shell">
          <Eyebrow idx="10">마무리</Eyebrow>
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
            <Link className="btn btn-ghost" to="/history">
              내 기록 보기
            </Link>
            <button className="btn-quiet" onClick={removeThis}>
              이 결과 삭제
            </button>
          </div>

          <div className="meta-line num">
            <span>검사일 {new Date(stored.completedAt).toLocaleString("ko-KR")}</span>
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
