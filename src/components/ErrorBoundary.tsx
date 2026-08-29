import { Component, type ReactNode } from "react";
import { BRAND } from "../lib/mycore12";
import { clearActiveSession } from "../lib/storage";
import { LocaleContext, type LocaleContextValue } from "../i18n/LocaleProvider";
import { DEFAULT_LOCALE, UI } from "../i18n/resources";

/**
 * 데이터 손상·문항 누락 등 예기치 못한 오류에서 흰 화면 대신 복구 경로를 제공한다.
 * (문항 데이터 또는 결과 데이터가 없을 때의 최종 방어선)
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  // 클래스 컴포넌트라 훅을 쓸 수 없어 contextType 으로 locale 을 읽는다
  static contextType = LocaleContext;
  declare context: LocaleContextValue | null;

  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[MYCORE12]", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const locale = this.context?.locale ?? DEFAULT_LOCALE;
    const t = this.context?.t ?? UI[DEFAULT_LOCALE];
    return (
      <main className="shell static-page">
        <h2>{t.errors.boundaryTitle}</h2>
        <p style={{ color: "var(--color-text-secondary)", maxWidth: 620 }}>
          {t.errors.boundaryBody}
        </p>
        <button
          className="btn btn-primary"
          onClick={() => {
            clearActiveSession();
            window.location.href = "/";
          }}
        >
          {t.errors.goHome}
        </button>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 13, marginTop: 28 }}>
          {BRAND.copyright}
          {locale === "ko" ? ` ${BRAND.copyrightKo}` : ""}
        </p>
      </main>
    );
  }
}
