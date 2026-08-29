/**
 * 결과 화면 표시용 helper (locale 중립).
 *
 * 배경: 이전 구현은 overview 를 한국어 문구 "이런 모습을 만드는" 의 위치로 잘라
 * 두 문단으로 나눴다. 이 방식은 English 유형 데이터에서 깨지므로, 특정 언어의
 * 문구를 구조 marker 로 쓰지 않는 방식으로 바꾼다.
 *
 * 대신 personaName 이 소개되는 문장을 기준으로 나눈다. personaName 은 어떤
 * 언어의 유형 데이터에도 반드시 존재하는 값이고, overview 안에서 그 이름이
 * 처음 등장하는 문장이 곧 "이 조합이 어떤 이름인지" 설명하는 지점이기 때문이다.
 * 이름이 등장하지 않으면 전체를 한 문단으로 둔다(정보 손실 없음).
 */

/**
 * 문장 단위 분리 (한국어 종결부호와 영어 문장 경계 모두 처리).
 *
 * 영어에서는 마침표가 약어(Dr., e.g., U.S.)에도 쓰이므로, 마침표 뒤에 공백이
 * 오고 그 다음이 대문자/따옴표/여는 괄호일 때만 경계로 본다. 한국어는 종결부호
 * 뒤 공백을 그대로 경계로 본다.
 */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.!?。？！])\s+(?=[^\s])/u)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * overview 를 두 문단으로 나눈다.
 * lead  = personaName 이 소개되기 전까지의 서술
 * rest  = 이름 소개 문장부터 끝까지 (없으면 빈 문자열)
 */
export function splitOverview(
  overview: string,
  personaName: string
): { lead: string; rest: string } {
  const sentences = splitSentences(overview);
  if (sentences.length === 0) return { lead: overview, rest: "" };

  const idx = personaName
    ? sentences.findIndex(s => s.includes(personaName))
    : -1;

  // 이름이 없거나 첫 문장부터 등장하면 나누지 않는다
  if (idx <= 0) return { lead: overview, rest: "" };

  return {
    lead: sentences.slice(0, idx).join(" "),
    rest: sentences.slice(idx).join(" ")
  };
}

/**
 * 같은 페이지 안에서 앞 섹션에 이미 나온 문장을 뒤 섹션에서 생략한다.
 * 데이터는 그대로 두고 표시 단계에서만 중복을 줄인다.
 */
export function dropSentences(text: string, seen: Set<string>): string {
  return splitSentences(text)
    .filter(s => !seen.has(s))
    .join(" ");
}

/** 여러 문자열에서 문장 집합을 만든다 (중복 제거 기준용) */
export function sentenceSet(texts: string[]): Set<string> {
  return new Set(texts.flatMap(splitSentences));
}
