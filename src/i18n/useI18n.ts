import { useContext } from "react";
import { LocaleContext, type LocaleContextValue } from "./LocaleProvider";
import {
  axisLabel,
  contextLabel,
  energyLabel,
  fill,
  LOCALE_TAG
} from "./resources";

export interface I18n extends LocaleContextValue {
  /** 내부 한국어 에너지명 → 현재 locale 표시명 */
  energy: (energy: string) => string;
  /** axis key 또는 한국어 축 라벨 → 현재 locale 표시명 */
  axis: (axisKeyOrLabel: string) => string;
  /** 한국어 context 라벨 → 현재 locale 표시명 */
  context: (label: string) => string;
  /** `{name}` placeholder 치환 */
  fill: (template: string, vars: Record<string, string | number>) => string;
  /** Intl 용 BCP 47 태그 (ko-KR / en-US) */
  localeTag: string;
  /** locale 에 맞는 날짜·시각 표기 */
  formatDateTime: (iso: string) => string;
}

export function useI18n(): I18n {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useI18n 은 LocaleProvider 안에서만 사용할 수 있습니다.");
  }
  const { locale } = ctx;
  const tag = LOCALE_TAG[locale];

  return {
    ...ctx,
    energy: e => energyLabel(e, locale),
    axis: a => axisLabel(a, locale),
    context: c => contextLabel(c, locale),
    fill,
    localeTag: tag,
    formatDateTime: iso => new Date(iso).toLocaleString(tag)
  };
}
