import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteResult, getResults } from "../lib/storage";

export default function History() {
  const navigate = useNavigate();
  const [results, setResults] = useState(() => [...getResults()].reverse());

  const remove = (id: string) => {
    if (!window.confirm("이 결과를 삭제할까요?")) return;
    deleteResult(id);
    setResults([...getResults()].reverse());
  };

  return (
    <main className="page-enter shell static-page">
      <h1>내 검사 기록</h1>
      <p className="lede">
        기록은 이 기기에만 저장됩니다. 유형이 이전과 다르게 나왔다면 성향이
        바뀌었다기보다, 이번 응답에서 어떤 축의 균형이 어느 쪽으로 움직였는지를
        함께 살펴보세요.
      </p>

      {results.length === 0 ? (
        <div>
          <p className="prose" style={{ marginBottom: 26 }}>
            아직 저장된 결과가 없습니다.
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/assessment")}>
            마이코어12 시작하기
          </button>
        </div>
      ) : (
        <div className="history-list">
          {results.map(r => (
            <div className="history-item" key={r.sessionId}>
              <div>
                <div className="name">{r.typePersonaName}</div>
                <div className="meta num">
                  {new Date(r.completedAt).toLocaleString("ko-KR")} · 문항은행{" "}
                  {r.bankVersion}
                </div>
              </div>
              <div className="acts">
                <Link className="btn btn-ghost" to={`/result/${r.sessionId}`}>
                  결과 보기
                </Link>
                <button className="btn-quiet" onClick={() => remove(r.sessionId)}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
