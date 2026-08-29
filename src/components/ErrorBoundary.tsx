import { Component, type ReactNode } from "react";
import { BRAND } from "../lib/mycore12";
import { clearActiveSession } from "../lib/storage";

/**
 * 데이터 손상·문항 누락 등 예기치 못한 오류에서 흰 화면 대신 복구 경로를 제공한다.
 * (문항 데이터 또는 결과 데이터가 없을 때의 최종 방어선)
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[MYCORE12]", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="shell how">
        <h2>화면을 불러오지 못했어요</h2>
        <p style={{ color: "var(--ink-2)", maxWidth: 620 }}>
          진행 중인 검사 데이터를 읽는 중 문제가 발생했습니다. 아래 버튼으로
          검사를 새로 시작하면 정상적으로 이용할 수 있어요.
        </p>
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>
          {this.state.error.message}
        </p>
        <button
          className="btn btn-primary"
          onClick={() => {
            clearActiveSession();
            window.location.href = "/";
          }}
        >
          처음 화면으로 이동
        </button>
        <p style={{ color: "var(--ink-2)", fontSize: 13, marginTop: 28 }}>
          {BRAND.copyright} {BRAND.copyrightKo}
        </p>
      </main>
    );
  }
}
