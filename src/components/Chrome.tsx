import { Link, useNavigate } from "react-router-dom";
import { BRAND } from "../lib/mycore12";
import { deleteAllLocalData } from "../lib/storage";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell inner">
        <Link to="/" className="wordmark">
          <span className="ko">{BRAND.nameKo}</span>
          <span className="en">{BRAND.nameEn}</span>
        </Link>
        <nav className="header-nav" aria-label="주요 메뉴">
          <Link to="/how">검사 방식</Link>
          <Link to="/history">내 기록</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const navigate = useNavigate();
  const onDeleteAll = () => {
    if (
      window.confirm(
        `이 기기에 저장된 ${BRAND.nameKo} 검사 기록과 결과를 모두 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.`
      )
    ) {
      deleteAllLocalData();
      navigate("/");
    }
  };

  return (
    <footer className="site-footer">
      <div className="shell grid">
        <div>
          <div className="brandline">{BRAND.lockup}</div>
          <div className="tag">{BRAND.tagline}</div>
          <div className="legal">
            {BRAND.copyright}
            <br />
            {BRAND.copyrightKo}
          </div>
        </div>
        <nav className="links" aria-label="안내 메뉴">
          <Link to="/how">검사 원리</Link>
          <Link to="/privacy">개인정보 · 로컬저장 안내</Link>
          <button type="button" onClick={onDeleteAll}>
            내 결과 삭제
          </button>
        </nav>
      </div>
    </footer>
  );
}
