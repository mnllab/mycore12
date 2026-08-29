/**
 * locale 별 문장 조립 helper.
 *
 * 한국어 조사(과/와) 계산은 한국어에서만 의미가 있으므로 공용 렌더링 코드에서
 * 분리해 이 파일에 둔다. English 는 접속사로 잇는다.
 */
import type { Locale } from "./resources";

/** 한국어 조사: 받침 유무에 따라 과/와 */
const gwa = (w: string) => {
  const ch = w.charCodeAt(w.length - 1);
  const batchim = ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0;
  return `${w}${batchim ? "과" : "와"}`;
};

/**
 * 두 에너지 이름을 한 구로 잇는다.
 *   ko: "추진과 숙고" / "조율와 자율"이 아니라 받침에 맞춰 처리
 *   en: "Initiative and Deliberation"
 * 넘기는 값은 이미 locale 표시명으로 변환된 이름이어야 한다.
 */
export function joinPair(a: string, b: string, locale: Locale): string {
  return locale === "ko" ? `${gwa(a)} ${b}` : `${a} and ${b}`;
}
