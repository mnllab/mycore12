import { useEffect, useRef, useState } from "react";
import { Download } from "./icons";
import { useI18n } from "../i18n/useI18n";
import { buildExportFile, downloadExport } from "../lib/resultExport";
import type { StoredAssessmentResult } from "../lib/storage";
import type { Locale } from "../i18n/resources";

/**
 * 결과 다운로드 — 한국어/English × Markdown/텍스트 네 가지.
 *
 * 화면 언어와 무관하게 원하는 언어를 고를 수 있고, 선택해도 현재 locale 이나
 * 세션 상태는 바뀌지 않는다. 저장된 결과를 읽어 파일만 만드는 read-only 동작이다.
 */
export default function ResultDownload({
  stored
}: {
  stored: StoredAssessmentResult;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 바깥을 누르거나 Esc 를 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const save = (locale: Locale, format: "md" | "txt") => {
    downloadExport(buildExportFile(stored, locale, format));
    setOpen(false);
    buttonRef.current?.focus();
  };

  const groups: { label: string; locale: Locale }[] = [
    { label: t.result.downloadKo, locale: "ko" },
    { label: t.result.downloadEn, locale: "en" }
  ];

  return (
    <div className="download-wrap" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="btn btn-secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <Download size={16} />
        {t.result.download}
      </button>

      {open && (
        <div className="download-menu" role="menu" aria-label={t.result.downloadAria}>
          {groups.map(g => (
            <div className="download-group" key={g.locale}>
              <p className="download-group-label" lang={g.locale}>
                {g.label}
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={() => save(g.locale, "md")}
              >
                {t.result.downloadMd}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => save(g.locale, "txt")}
              >
                {t.result.downloadTxt}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
