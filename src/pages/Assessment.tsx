import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BRAND } from "../lib/mycore12";
import { MiniFooter } from "../components/Chrome";
import { ArrowLeft, ArrowRight, Check } from "../components/icons";
import {
  completeSession,
  getActiveSession,
  questionsOf,
  saveSession,
  startNewSession,
  type AssessmentSession
} from "../lib/storage";
import { DEFAULT_ASSESSMENT_LENGTH, isAssessmentLength } from "../lib/draw";
import { useI18n } from "../i18n/useI18n";
import { localizeQuestion } from "../i18n/content";

/**
 * 응답값 매핑 (기존과 동일 — 채점 로직은 건드리지 않는다)
 *   1 = 왼쪽/첫 번째 보기(optionA)에 많이 가깝다
 *   2 = 왼쪽/첫 번째 보기에 조금 가깝다
 *   3 = 둘 다 비슷하다
 *   4 = 오른쪽/두 번째 보기(optionB)에 조금 가깝다
 *   5 = 오른쪽/두 번째 보기에 많이 가깝다
 *
 * 화면에는 A/B 라는 식별자를 노출하지 않는다. A/B 는 데이터 식별자로만 쓴다.
 */
type Response = 1 | 2 | 3 | 4 | 5;

/**
 * 좁은 화면의 5단 응답. 위에서 아래로 값 1→5 이며 의미는 기존과 동일하다.
 *   1,2 = 첫 번째 보기(optionA) 쪽 / 3 = 중립 / 4,5 = 두 번째 보기(optionB) 쪽
 * tone 은 indicator 강도(strong/soft/neutral), side 는 어느 보기의 에너지 색을 쓸지다.
 */
type ScaleKey = "very" | "somewhat" | "neutral";

const V_SCALE: {
  value: Response;
  labelKey: ScaleKey;
  side: "a" | "b" | null;
  tone: "strong" | "soft" | "neutral";
}[] = [
  { value: 1, labelKey: "very", side: "a", tone: "strong" },
  { value: 2, labelKey: "somewhat", side: "a", tone: "soft" },
  { value: 3, labelKey: "neutral", side: null, tone: "neutral" },
  { value: 4, labelKey: "somewhat", side: "b", tone: "soft" },
  { value: 5, labelKey: "very", side: "b", tone: "strong" }
];

/**
 * 좌우 척도의 5단계. 방향은 왼쪽 보기 → 오른쪽 보기 순서 그대로다.
 * side/tone 은 표시용 indicator 색 강도이며 응답값 의미와는 무관하다.
 */
const SCALE: {
  value: Response;
  labelKey: ScaleKey;
  side: "a" | "b" | null;
  tone: "strong" | "soft" | "neutral";
}[] = [
  { value: 1, labelKey: "very", side: "a", tone: "strong" },
  { value: 2, labelKey: "somewhat", side: "a", tone: "soft" },
  { value: 3, labelKey: "neutral", side: null, tone: "neutral" },
  { value: 4, labelKey: "somewhat", side: "b", tone: "soft" },
  { value: 5, labelKey: "very", side: "b", tone: "strong" }
];

/**
 * 가로폭이 충분하면 보기를 좌우로 놓고 척도도 좌우로 둔다.
 * 좁으면 보기를 위아래로 놓고, 각 보기 카드에 강도 버튼을 직접 붙인다.
 * (위쪽 보기를 왼쪽 응답으로 변환해 이해해야 하는 구조를 만들지 않는다)
 */
const WIDE_QUERY = "(min-width: 700px)";

function useWideLayout(): boolean {
  const read = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(WIDE_QUERY).matches
      : true;
  const [wide, setWide] = useState(read);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(WIDE_QUERY);
    const onChange = () => setWide(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return wide;
}

export default function Assessment() {
  const { locale, t, fill } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  // 검사 길이는 시작할 때 한 번 정해지고, 진행 중에는 바뀌지 않는다.
  const requested = (location.state as { length?: unknown } | null)?.length;
  const [session, setSession] = useState<AssessmentSession>(
    () =>
      getActiveSession() ??
      startNewSession(
        isAssessmentLength(requested) ? requested : DEFAULT_ASSESSMENT_LENGTH
      )
  );
  const [processing, setProcessing] = useState(false);
  const advanceTimer = useRef<number | null>(null);
  const wide = useWideLayout();

  const questions = useMemo(() => questionsOf(session), [session.sessionId]);
  const index = Math.min(session.currentIndex, questions.length - 1);
  // 화면 문구만 locale overlay 로 덮는다. id·axis·optionAValue 등은 원본 그대로다.
  const q = localizeQuestion(questions[index], locale);
  const answered = Object.keys(session.answers).length;
  const allAnswered = answered === questions.length;
  const current = session.answers[q.id] as Response | undefined;

  useEffect(() => {
    return () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  // 문항이 바뀌면 질문이 보이는 위치에서 시작한다 (이전 문항의 스크롤 위치가 남지 않게)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.scrollY <= 8) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [q.id]);

  const update = (next: AssessmentSession) => {
    setSession(next);
    saveSession(next);
  };

  const finish = (finalSession: AssessmentSession) => {
    setProcessing(true);
    window.setTimeout(() => {
      const stored = completeSession(finalSession);
      navigate(`/result/${stored.sessionId}`, { replace: true, state: { fresh: true } });
    }, 1100);
  };

  const answer = (value: Response) => {
    const next: AssessmentSession = {
      ...session,
      answers: { ...session.answers, [q.id]: value }
    };
    const isLast = index === questions.length - 1;
    const complete = Object.keys(next.answers).length === questions.length;

    if (isLast && complete) {
      update(next);
      finish(next);
      return;
    }
    update(next);
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      update({ ...next, currentIndex: Math.min(index + 1, questions.length - 1) });
    }, 180);
  };

  /** 스크린리더용 응답 설명 — 글자 A/B 대신 실제 보기 문장을 읽어준다 */
  const ariaFor = (value: Response) => {
    switch (value) {
      case 1:
        return fill(t.assessment.ariaVeryA, { option: q.optionA });
      case 2:
        return fill(t.assessment.ariaSomewhatA, { option: q.optionA });
      case 3:
        return t.assessment.ariaNeutral;
      case 4:
        return fill(t.assessment.ariaSomewhatB, { option: q.optionB });
      default:
        return fill(t.assessment.ariaVeryB, { option: q.optionB });
    }
  };

  const groupLabel = fill(t.assessment.groupAria, {
    optionA: q.optionA,
    optionB: q.optionB
  });

  /**
   * 두 보기를 구분하는 고정 색 — 첫 번째 보기는 남색, 두 번째는 와인색.
   * 흰 배경 대비를 10.4 / 9.1 로 맞춰 어느 쪽도 더 강해 보이지 않게 했다.
   * 문장과 응답 indicator가 같은 색을 쓰고, 강도(strong/soft)는 좌우 대칭이다.
   */
  const choiceVar = (side: "a" | "b") =>
    side === "a" ? "var(--choice-a)" : "var(--choice-b)";
  const textColor = choiceVar;
  const dotStyle = (s: { side: "a" | "b" | null }) =>
    s.side ? { color: choiceVar(s.side) } : undefined;

  if (processing) {
    return (
      <>
        <main className="assessment-screen processing page-enter" aria-live="polite">
          <OrbitPulse />
          <p>{t.assessment.processing}</p>
        </main>
        <MiniFooter />
      </>
    );
  }

  return (
    <main className="assessment-screen">
      <div className="assess-top">
        <div className="shell">
          <div className="row">
            {/* 사이트 헤더와 같은 브랜드 표기 규칙 — English 에서는 MYCORE12 만 쓴다 */}
            <Link to="/" className="brand">
              {locale === "ko" ? (
                <>
                  <span>{BRAND.nameKo}</span>
                  <span className="en">{BRAND.nameEn}</span>
                </>
              ) : (
                <span>{BRAND.nameEn}</span>
              )}
            </Link>
            <span className="count num" aria-live="polite">
              <b>{index + 1}</b> / {questions.length}
            </span>
          </div>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={answered}
          aria-label={t.assessment.progressAria}
        >
          <div
            className="progress-fill"
            style={{ width: `${(answered / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="shell assess-body">
        <div className="q-card page-enter" key={q.id}>
          <h1 className="q-scenario">{q.scenario}</h1>
          <p className="q-prompt">{q.prompt}</p>

          {wide ? (
            /* ── 가로폭이 넉넉할 때: 보기 좌우 + 척도 좌우 ── */
            <div className="choice-h">
              <div className="choice-pair">
                <div className={`choice-card ${current && current <= 2 ? "lean" : ""}`}>
                  <Check className="check" size={20} />
                  <span style={{ color: textColor("a") }}>{q.optionA}</span>
                </div>
                <div className={`choice-card ${current && current >= 4 ? "lean" : ""}`}>
                  <Check className="check" size={20} />
                  <span style={{ color: textColor("b") }}>{q.optionB}</span>
                </div>
              </div>

              <div className="scale-h" role="radiogroup" aria-label={groupLabel}>
                <span className="rail" aria-hidden="true" />
                {SCALE.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={current === s.value}
                    aria-pressed={current === s.value}
                    aria-label={ariaFor(s.value)}
                    onClick={() => answer(s.value)}
                  >
                    <span
                      className={`dot ${s.tone}`}
                      style={dotStyle(s)}
                      aria-hidden="true"
                    />
                    <span className="cap">{t.assessment[s.labelKey]}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── 좁을 때: 보기 문장을 위아래 끝에 두고 5단 응답을 한 열로 ──
               화면 위→아래 순서가 응답값 1,2,3,4,5 와 그대로 대응한다. */
            <div className="choice-v" role="radiogroup" aria-label={groupLabel}>
              <p className="v-text" style={{ color: textColor("a") }}>
                {q.optionA}
              </p>

              <div className="v-scale">
                {V_SCALE.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={current === s.value}
                    aria-label={ariaFor(s.value)}
                    onClick={() => answer(s.value)}
                    className={`v-opt ${current === s.value ? "on" : ""}`}
                  >
                    <span className="v-opt-label">{t.assessment[s.labelKey]}</span>
                    <span
                      className={`v-dot ${s.tone}`}
                      style={dotStyle(s)}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>

              <p className="v-text" style={{ color: textColor("b") }}>
                {q.optionB}
              </p>
            </div>
          )}

          <div className="assess-nav">
            {allAnswered && (
              <button className="btn btn-primary" type="button" onClick={() => finish(session)}>
                {t.assessment.viewResults}
              </button>
            )}
            <div className="assess-nav-steps">
              <button
                className="btn-text"
                type="button"
                onClick={() => update({ ...session, currentIndex: index - 1 })}
                disabled={index === 0}
              >
                <ArrowLeft />
                {t.assessment.previous}
              </button>
              {current && index < questions.length - 1 && (
                <button
                  className="btn-text"
                  type="button"
                  onClick={() => update({ ...session, currentIndex: index + 1 })}
                >
                  {t.assessment.next}
                  <ArrowRight />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <MiniFooter />
    </main>
  );
}

function OrbitPulse() {
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
      <circle cx="38" cy="38" r="31" fill="none" stroke="var(--color-border)" strokeWidth="1" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (Math.PI * 2 * i) / 12 - Math.PI / 2;
        return (
          <circle
            key={i}
            cx={38 + 31 * Math.cos(a)}
            cy={38 + 31 * Math.sin(a)}
            r="3"
            fill="var(--color-primary)"
            className="node-reveal"
            style={{ animationDelay: `${i * 70}ms` }}
          />
        );
      })}
    </svg>
  );
}
