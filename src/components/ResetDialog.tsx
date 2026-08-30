import { useEffect, useRef } from "react";
import { useI18n } from "../i18n/useI18n";

/**
 * 데이터 초기화 확인 다이얼로그 — 예 / 아니오 두 가지만 둔다.
 *
 * "아니오"의 의미는 상황에 따라 다르다.
 *   - 진행 중인 세션이 있을 때: 지금 하던 검사만 지운다 (기록은 남긴다)
 *   - 진행 중인 세션이 없을 때: 아무것도 지우지 않는다 (사실상 취소)
 * 버튼을 두 개로 유지해 단순하게 두고, 다이얼로그 바깥을 클릭하거나
 * Esc 를 누르면 버튼 없이도 항상 "아무것도 하지 않고 닫기"가 가능하다.
 */
export default function ResetDialog({
  open,
  hasActiveSession,
  onYes,
  onNo,
  onCancel
}: {
  open: boolean;
  hasActiveSession: boolean;
  onYes: () => void;
  onNo: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const noRef = useRef<HTMLButtonElement>(null);

  // 열릴 때 더 안전한 선택지(아니오)에 포커스를 두고, Esc/포커스 트랩을 건다
  useEffect(() => {
    if (!open) return;
    noRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>("button");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="confirm-overlay"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="confirm-dialog"
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={t.home.resetDialogAria}
        aria-labelledby="reset-dialog-title"
      >
        <h2 id="reset-dialog-title">{t.home.resetTitle}</h2>
        <div className="confirm-lines">
          <p>{t.home.resetLineYes}</p>
          <p>{hasActiveSession ? t.home.resetLineNo : t.home.resetLineCancel}</p>
        </div>
        <div className="confirm-actions">
          <button type="button" className="btn btn-secondary" onClick={onYes}>
            {t.home.resetYes}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            ref={noRef}
            onClick={hasActiveSession ? onNo : onCancel}
          >
            {t.home.resetNo}
          </button>
        </div>
      </div>
    </div>
  );
}
