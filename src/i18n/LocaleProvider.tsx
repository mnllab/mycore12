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

/**
 * 문서 언어와 locale 전용 메타를 갱신한다.
 *
 * title / description / og:title / og:description 은 경로마다 달라지므로
 * RouteMeta 가 담당한다. (Provider 의 effect 는 자식보다 늦게 실행되므로
 * 여기서 title 을 함께 쓰면 route 별 값이 홈 값으로 덮인다.)
 */
function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  const el = document.querySelector('meta[property="og:locale"]');
  if (el) el.setAttribute("content", UI[locale].meta.ogLocale);
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
