/**
 * 공개용 버전 히스토리 (푸터 → /changelog).
 *
 * 개발용 상세 기록은 저장소 루트의 CHANGELOG.md 에 있다. 이 파일은 그중
 * 방문자에게 의미 있는 변경만 짧게 옮겨 적은 요약본이며, 새 버전을 낼 때마다
 * package.json 버전을 올리고 이 배열 맨 위에 새 항목을 추가한다.
 */
import koNotes from "../locales/ko/releaseNotes.json";
import enNotes from "../locales/en/releaseNotes.json";
import pkg from "../../package.json";
import type { Locale } from "./resources";

export interface ReleaseNote {
  version: string;
  date: string;
  text: string;
}

export const RELEASE_NOTES: Record<Locale, ReleaseNote[]> = {
  ko: koNotes,
  en: enNotes
};

/** package.json 의 버전이 곧 현재 버전이다 (표시값을 따로 관리하지 않는다) */
export const APP_VERSION: string = pkg.version;

/** 최신 항목의 날짜 — 배열은 항상 최신순이라 첫 항목을 쓴다 */
export const LATEST_RELEASE_DATE: string = koNotes[0]?.date ?? "";
