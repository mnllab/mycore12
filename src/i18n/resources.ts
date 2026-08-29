/**
 * 다국어 리소스 (ko / en).
 *
 * 원칙: **내부 key 는 절대 번역하지 않는다.**
 * 채점·매칭에 쓰이는 한국어 에너지명(추진·숙고 …), axis key(action …),
 * context key, optionAValue / optionBValue 는 그대로 두고,
 * 이 파일의 매핑은 **화면 표시 라벨에만** 적용한다.
 */
import koUi from "../locales/ko/ui.json";
import enUi from "../locales/en/ui.json";
import koGlossary from "../locales/ko/glossary.json";
import enGlossary from "../locales/en/glossary.json";

export type Locale = "ko" | "en";

export const LOCALES: Locale[] = ["ko", "en"];
export const DEFAULT_LOCALE: Locale = "ko";

/** 언어 선택 UI 표기 — 각 언어를 그 언어로 적는다 (국기 아이콘 사용 안 함) */
export const LOCALE_LABEL: Record<Locale, string> = {
  ko: "한국어",
  en: "English"
};

/** 날짜·숫자 서식용 BCP 47 태그 */
export const LOCALE_TAG: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US"
};

export const isLocale = (v: unknown): v is Locale =>
  v === "ko" || v === "en";

/** ko 리소스가 구조 기준이다. en 은 같은 형태를 갖는다. */
export type UiResource = typeof koUi;

export const UI: Record<Locale, UiResource> = {
  ko: koUi,
  en: enUi as unknown as UiResource
};

type GlossaryShape = typeof koGlossary;

const GLOSSARY: Record<Locale, GlossaryShape> = {
  ko: koGlossary,
  en: enGlossary as unknown as GlossaryShape
};

/**
 * 내부 한국어 에너지명 → locale 표시명.
 * glossary 의 axes 정의에서 파생하므로 매핑을 두 곳에 적지 않는다.
 */
const buildEnergyMap = (locale: Locale): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const axis of Object.values(GLOSSARY[locale].axes)) {
    // key 는 항상 한국어 원본(ko glossary 기준), 값은 해당 locale 표시명
    out[axis.pole1.ko] = locale === "ko" ? axis.pole1.ko : axis.pole1.en;
    out[axis.pole0.ko] = locale === "ko" ? axis.pole0.ko : axis.pole0.en;
  }
  return out;
};

const ENERGY_LABELS: Record<Locale, Record<string, string>> = {
  ko: buildEnergyMap("ko"),
  en: buildEnergyMap("en")
};

const AXIS_LABELS: Record<Locale, Record<string, string>> = {
  ko: Object.fromEntries(
    Object.entries(GLOSSARY.ko.axes).map(([k, v]) => [k, v.ko])
  ),
  en: Object.fromEntries(
    Object.entries(GLOSSARY.en.axes).map(([k, v]) => [k, v.en])
  )
};

const CONTEXT_LABELS: Record<Locale, Record<string, string>> = {
  ko: GLOSSARY.ko.contexts,
  en: GLOSSARY.en.contexts as Record<string, string>
};

/** 내부 한국어 에너지명(예: "추진")을 화면 표시명으로 바꾼다. 매핑이 없으면 원본을 그대로 쓴다. */
export const energyLabel = (energy: string, locale: Locale): string =>
  ENERGY_LABELS[locale][energy] ?? energy;

/** axis key(예: "action") 또는 한국어 축 라벨(예: "행동")을 표시명으로 바꾼다. */
export const axisLabel = (axisKeyOrLabel: string, locale: Locale): string => {
  const byKey = AXIS_LABELS[locale][axisKeyOrLabel];
  if (byKey) return byKey;
  // 데이터에 축 key 대신 한국어 라벨(axisLabel)이 들어온 경우도 처리한다
  const entry = Object.entries(GLOSSARY.ko.axes).find(
    ([, v]) => v.ko === axisKeyOrLabel
  );
  return entry ? AXIS_LABELS[locale][entry[0]] : axisKeyOrLabel;
};

/** 한국어 context 라벨(예: "개인 일상")을 표시명으로 바꾼다. */
export const contextLabel = (label: string, locale: Locale): string =>
  CONTEXT_LABELS[locale][label] ?? label;

/** `{name}` 형태의 placeholder 를 채운다. */
export const fill = (
  template: string,
  vars: Record<string, string | number>
): string =>
  template.replace(/\{(\w+)\}/g, (m, key) =>
    key in vars ? String(vars[key]) : m
  );
