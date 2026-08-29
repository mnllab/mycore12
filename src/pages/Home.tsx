import { Link, useNavigate } from "react-router-dom";
import OrbitGraphic from "../components/OrbitGraphic";
import { BRAND } from "../lib/mycore12";
import { ArrowRight } from "../components/icons";
import { getActiveSession, getLatestResult } from "../lib/storage";

export default function Home() {
  const navigate = useNavigate();
  const activeSession = getActiveSession();
  const latest = getLatestResult();

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
              일상에서 마주하는 36개의 상황에 답하면, 여섯 개의 상대선호 축
              위에서 내가 자연스럽게 쓰는 12가지 에너지의 균형을 하나의
              프로파일로 읽을 수 있습니다.
            </p>

            <div className="hero-ctas">
              <button
                className="btn btn-primary"
                onClick={() => navigate("/assessment")}
              >
                {activeSession ? "이어서 진행하기" : `${BRAND.nameKo} 시작하기`}
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
            <b>36개</b>
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
