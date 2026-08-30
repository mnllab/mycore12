import { Link, useNavigate } from "react-router-dom";
import { BRAND } from "../lib/mycore12";
import { deleteAllLocalData } from "../lib/storage";
import { FileText, Shield, Trash } from "./icons";
import { useI18n } from "../i18n/useI18n";
import { PUBLIC_CONTENT } from "../i18n/publicContent";
import { LOCALES, LOCALE_LABEL } from "../i18n/resources";

/**
 * 언어 선택 — 작고 절제된 텍스트 토글 (국기·배지 사용 안 함).
 * 현재 선택된 언어가 분명히 보이도록 aria-pressed 와 on 클래스를 함께 쓴다.
 */
function LocaleSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="locale-switch" role="group" aria-label={t.nav.localeAria}>
      {LOCALES.map(code => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={locale === code}
          className={locale === code ? "on" : ""}
          onClick={() => setLocale(code)}
        >
          {LOCALE_LABEL[code]}
        </button>
      ))}
    </div>
  );
}

export function SiteHeader() {
  const { locale, t } = useI18n();
  const nav = PUBLIC_CONTENT[locale].nav;
  return (
    <header className="site-header">
      <div className="shell inner">
        <Link to="/" className="wordmark">
          {locale === "ko" ? (
            <>
              <span className="ko">{BRAND.nameKo}</span>
              <span className="en">{BRAND.nameEn}</span>
            </>
          ) : (
            /* English 화면에서는 마이코어12를 주 브랜드로 반복하지 않는다 */
            <span className="ko">{BRAND.nameEn}</span>
          )}
        </Link>
        <nav className="header-nav" aria-label={t.nav.mainMenuAria}>
          <Link to="/about">{nav.explore}</Link>
          <Link to="/history">{t.nav.history}</Link>
          {/* 후원 — 화면이 좁으면 이미지 배너 대신 짧은 텍스트 링크로 바뀐다 */}
          <a
            className="donate"
            href="https://www.buymeacoffee.com/mnledu"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              className="donate-img"
              src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=mnledu&button_colour=FFDD00&font_colour=000000&font_family=Poppins&outline_colour=000000&coffee_colour=ffffff"
              alt={t.nav.supportAlt}
              height={32}
            />
            <span className="donate-text" aria-hidden="true">
              {t.nav.support}
            </span>
          </a>
          <LocaleSwitch />
        </nav>
      </div>
    </header>
  );
}

/**
 * 검사 화면처럼 네비게이션을 최소화해야 하는 화면용 저작권 표기.
 * 링크 없이 저작권 문구만 조용히 노출한다.
 */
export function MiniFooter() {
  const { locale } = useI18n();
  return (
    <footer className="mini-footer">
      <div className="shell">
        <span>{locale === "ko" ? BRAND.lockup : BRAND.nameEn}</span>
        <span>
          {BRAND.copyright}
          {locale === "ko" ? ` ${BRAND.copyrightKo}` : ""}
        </span>
      </div>
    </footer>
  );
}

export function SiteFooter() {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const nav = PUBLIC_CONTENT[locale].nav;

  const onDeleteAll = () => {
    if (window.confirm(t.errors.deleteAllConfirm)) {
      deleteAllLocalData();
      navigate("/");
    }
  };

  return (
    <footer className="site-footer">
      <div className="shell grid">
        <div>
          <div className="brandline">
            {locale === "ko" ? BRAND.lockup : BRAND.nameEn}
          </div>
          <div className="tag-line">{t.brand.tagline}</div>
          <div className="legal">
            {BRAND.copyright}
            {locale === "ko" && (
              <>
                <br />
                {BRAND.copyrightKo}
              </>
            )}
          </div>
        </div>
        <nav className="links" aria-label={t.nav.infoMenuAria}>
          <Link to="/about">{nav.about}</Link>
          <Link to="/energies">{nav.energies}</Link>
          <Link to="/how">
            <FileText />
            {nav.how}
          </Link>
          <Link to="/guide">{nav.guide}</Link>
          <Link to="/stories">{nav.stories}</Link>
          <Link to="/privacy">
            <Shield />
            {t.nav.privacy}
          </Link>
          <button type="button" onClick={onDeleteAll}>
            <Trash />
            {t.nav.deleteAll}
          </button>
        </nav>
      </div>
    </footer>
  );
}
