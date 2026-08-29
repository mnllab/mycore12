/**
 * 언어 상태 (ko / en).
 *
 * - 기본값은 항상 ko 다. 브라우저 언어를 감지해 자동 전환하지 않는다.
 * - 선택값은 mycore12.locale.v1 에 저장하고 새로고침 후 복원한다.
 * - locale 은 표시 전용이다. 검사 세션(sessionId·questionIds·answers·
 *   currentIndex·assessmentLength)과 채점 결과에는 전혀 관여하지 않는다.
 */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  DEFAULT_LOCALE,
  UI,
  isLocale,
  type Locale,
  type UiResource
} from "./resources";

export const LOCALE_STORAGE_KEY = "mycore12.locale.v1";

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: UiResource;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(raw) ? raw : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** 문서 언어와 메타 태그를 현재 locale 로 갱신한다 (ko 로 돌아오면 한국어 값 복원). */
function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  const meta = UI[locale].meta;

  document.documentElement.lang = locale;
  document.title = meta.title;

  const set = (selector: string, value: string) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute("content", value);
  };
  set('meta[name="description"]', meta.description);
  set('meta[property="og:title"]', meta.ogTitle);
  set('meta[property="og:description"]', meta.ogDescription);
  set('meta[property="og:locale"]', meta.ogLocale);
  set('meta[name="twitter:title"]', meta.ogTitle);
  set('meta[name="twitter:description"]', meta.ogDescription);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* 저장 불가 환경에서도 화면 전환 자체는 동작한다 */
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: UI[locale] }),
    [locale, setLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
