import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BRAND } from "../lib/mycore12";
import {
  completeSession,
  getActiveSession,
  questionsOf,
  saveSession,
  startNewSession,
  type AssessmentSession
} from "../lib/storage";

/** 5단계 — A/B 어느 쪽도 더 좋은 선택으로 보이지 않도록 완전히 대칭이다 */
const SCALE: { value: 1 | 2 | 3 | 4 | 5; label: string }[] = [
  { value: 1, label: "A에\n매우 가깝다" },
  { value: 2, label: "A에\n조금 가깝다" },
  { value: 3, label: "둘 다\n비슷하다" },
  { value: 4, label: "B에\n조금 가깝다" },
  { value: 5, label: "B에\n매우 가깝다" }
];

export default function Assessment() {
  const navigate = useNavigate();
  const [session, setSession] = useState<AssessmentSession>(
    () => getActiveSession() ?? startNewSession()
  );
  const [processing, setProcessing] = useState(false);
  const advanceTimer = useRef<number | null>(null);

  const questions = useMemo(() => questionsOf(session), [session.sessionId]);
  const index = Math.min(session.currentIndex, questions.length - 1);
  const q = questions[index];
  const answered = Object.keys(session.answers).length;
  const allAnswered = answered === questions.length;
  const current = session.answers[q.id];

  useEffect(() => {
    return () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    };
  }, []);

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

  const answer = (value: 1 | 2 | 3 | 4 | 5) => {
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

  if (processing) {
    return (
      <main className="processing page-enter" aria-live="polite">
        <OrbitPulse />
        <p>12가지 에너지의 균형을 정리하고 있습니다.</p>
      </main>
    );
  }

  return (
    <main>
      <div className="assess-top">
        <div className="shell">
          <div className="row">
            <Link to="/" className="brand">
              {BRAND.nameKo}
            </Link>
            <span className="count num" aria-live="polite">
              {index + 1} / {questions.length}
            </span>
          </div>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={answered}
          aria-label="응답 진행 상황"
        >
          <div
            className="progress-fill"
            style={{ width: `${(answered / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="shell assess-body">
        <div className="q-card page-enter" key={q.id}>
          <p className="q-context">{q.contextLabel}</p>
          <h1 className="q-scenario">{q.scenario}</h1>
          <p className="q-prompt">{q.prompt}</p>

          <div className={`option ${current && current <= 2 ? "lean" : ""}`}>
            <span className="mark" aria-hidden="true">
              A
            </span>
            <span className="text">{q.optionA}</span>
          </div>

          <div className="scale-wrap">
            <div className="scale-ends" aria-hidden="true">
              <span>A 쪽</span>
              <span>B 쪽</span>
            </div>
            <div
              className="scale"
              role="radiogroup"
              aria-label={`A: ${q.optionA} / B: ${q.optionB} 중 나와 가까운 정도`}
            >
              {SCALE.map(s => (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={current === s.value}
                  aria-pressed={current === s.value}
                  aria-label={q.responseScale[String(s.value)]}
                  onClick={() => answer(s.value)}
                >
                  <span className="dot" aria-hidden="true" />
                  <span style={{ whiteSpace: "pre-line" }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={`option ${current && current >= 4 ? "lean" : ""}`}>
            <span className="mark" aria-hidden="true">
              B
            </span>
            <span className="text">{q.optionB}</span>
          </div>

          <div className="assess-nav">
            <button
              className="btn-quiet"
              type="button"
              onClick={() => update({ ...session, currentIndex: index - 1 })}
              disabled={index === 0}
            >
              이전 문항
            </button>

            {allAnswered ? (
              <button className="btn btn-primary" type="button" onClick={() => finish(session)}>
                결과 보기
              </button>
            ) : current && index < questions.length - 1 ? (
              <button
                className="btn-quiet"
                type="button"
                onClick={() => update({ ...session, currentIndex: index + 1 })}
              >
                다음 문항
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function OrbitPulse() {
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
      <circle cx="38" cy="38" r="31" fill="none" stroke="var(--hairline)" strokeWidth="1" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (Math.PI * 2 * i) / 12 - Math.PI / 2;
        return (
          <circle
            key={i}
            cx={38 + 31 * Math.cos(a)}
            cy={38 + 31 * Math.sin(a)}
            r="3"
            fill="var(--deep)"
            className="node-reveal"
            style={{ animationDelay: `${i * 70}ms` }}
          />
        );
      })}
    </svg>
  );
}
