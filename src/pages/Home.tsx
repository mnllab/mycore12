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

export default function Home() {
  const navigate = useNavigate();
  const activeSession = getActiveSession();
  const latest = getLatestResult();
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
              <h1>{BRAND.nameKo}</h1>
              <p className="wordmark-en">{BRAND.nameEn}</p>
              <p className="tagline">{BRAND.tagline}</p>
              <span className="descriptor">{BRAND.descriptor}</span>
            </div>

            <p className="lede">
              일상에서 마주하는 상황에 답하면, 여섯 개의 상대선호 축 위에서 내가
              자연스럽게 쓰는 12가지 에너지의 균형을 하나의 프로파일로 읽을 수
              있습니다.
            </p>

            {activeSession ? (
              <p className="length-resume">
                진행 중인 {activeSession.assessmentLength}문항 검사가 있습니다.
                이어서 진행하면 같은 문항으로 계속됩니다.
              </p>
            ) : (
              <div className="length-pick">
                <h2>검사 길이를 선택해 주세요</h2>
                <p className="length-sub">
                  문항이 많을수록 여러 상황에서의 성향을 더 충분히 반영할 수
                  있습니다.
                </p>
                <div className="length-grid" role="radiogroup" aria-label="검사 길이">
                  {LENGTH_OPTIONS.map(opt => (
                    <button
                      key={opt.length}
                      type="button"
                      role="radio"
                      aria-checked={length === opt.length}
                      className={`length-card ${length === opt.length ? "on" : ""}`}
                      onClick={() => setLength(opt.length)}
                    >
                      <span className="length-head">
                        <b className="num">{opt.title}</b>
                        {opt.recommended && <span className="length-badge">추천</span>}
                      </span>
                      <span className="length-tag">
                        {opt.tagline}
                        {length === opt.length && (
                          <Check className="length-check" size={15} />
                        )}
                      </span>
                      <span className="length-desc">{opt.description}</span>
                    </button>
                  ))}
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
                {activeSession ? "이어서 진행하기" : "검사 시작"}
              </button>
              <Link className="btn btn-secondary" to="/how">
                검사 방식 알아보기
              </Link>
            </div>

            {latest && (
              <Link className="hero-link" to={`/result/${latest.sessionId}`}>
                최근 프로파일 다시 보기 — {latest.typePersonaName}
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
            <b className="num">{length}개</b>
            <span>의 상황문항에 답합니다</span>
          </div>
          <div className="cell">
            <b>12가지</b>
            <span>의 에너지를 살펴봅니다</span>
          </div>
          <div className="cell">
            <b>64개</b>
            <span>의 고유한 조합 가운데 나의 패턴</span>
          </div>
          <div className="cell">
            <b>정답 없음</b>
            <span>모든 에너지는 동등한 강점입니다</span>
          </div>
        </div>
      </div>
    </main>
  );
}
