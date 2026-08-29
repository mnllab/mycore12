import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteResult, getResults } from "../lib/storage";
import { useI18n } from "../i18n/useI18n";
import { localizedTypeByCode } from "../i18n/content";

export default function History() {
  const navigate = useNavigate();
  const { locale, t, formatDateTime, fill } = useI18n();
  const [results, setResults] = useState(() => [...getResults()].reverse());

  const remove = (id: string) => {
    if (!window.confirm(t.history.deleteConfirm)) return;
    deleteResult(id);
    setResults([...getResults()].reverse());
  };

  return (
    <main className="page-enter shell static-page">
      <h1>{t.history.title}</h1>
      <p className="lede">{t.history.lede}</p>

      {results.length === 0 ? (
        <div>
          <p className="prose" style={{ marginBottom: 26 }}>
            {t.history.empty}
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/assessment")}>
            {t.history.start}
          </button>
        </div>
      ) : (
        <div className="history-list">
          {results.map(r => {
            // 저장된 typePersonaName 이 아니라 code 로 현재 유형을 찾아 표시한다
            const type = localizedTypeByCode(r.code, locale);
            return (
              <div className="history-item" key={r.sessionId}>
                <div>
                  {/* 매칭 실패 시에도 English 화면에 한국어 저장 이름을 노출하지 않는다 */}
                  <div className="name">
                    {type?.personaName ??
                      (locale === "ko" ? r.typePersonaName : t.result.mismatchTitle)}
                  </div>
                  <div className="meta num">
                    {formatDateTime(r.completedAt)} ·{" "}
                    {fill(t.result.questionBank, { version: r.bankVersion })}
                  </div>
                </div>
                <div className="acts">
                  <Link className="btn btn-secondary" to={`/result/${r.sessionId}`}>
                    {t.history.view}
                  </Link>
                  <button className="btn-text" onClick={() => remove(r.sessionId)}>
                    {t.history.delete}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
