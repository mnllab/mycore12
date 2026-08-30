/**
 * 공개 콘텐츠 리소스 (소개 · 12에너지 · 검사 원리 · 활용 가이드 · 읽을거리).
 *
 * 문항/유형 데이터와 UI 단문 리소스와는 분리해 관리한다.
 * 승인된 한국어·영어 문안을 그대로 담고 있으며 런타임에서 문장을 생성하지 않는다.
 */
import koPublic from "../locales/ko/publicContent.json";
import enPublic from "../locales/en/publicContent.json";
import koStories from "../locales/ko/stories.json";
import enStories from "../locales/en/stories.json";
import type { Locale } from "./resources";

export type PublicContent = typeof koPublic;
export type StoriesContent = typeof koStories;
export type Story = StoriesContent["articles"][number];

export const PUBLIC_CONTENT: Record<Locale, PublicContent> = {
  ko: koPublic,
  en: enPublic as unknown as PublicContent
};

export const STORIES: Record<Locale, StoriesContent> = {
  ko: koStories,
  en: enStories as unknown as StoriesContent
};

/** 승인된 8개 slug — 이 순서가 목록 표시 순서다 */
export const STORY_SLUGS = koStories.articles.map(a => a.slug);

export const findStory = (slug: string, locale: Locale): Story | undefined =>
  STORIES[locale].articles.find(a => a.slug === slug);

/**
 * 결과 화면 하단의 추천 글.
 * 채점·유형 매칭·저장을 건드리지 않는 고정 목록이다.
 */
export const RESULT_RELATED_SLUGS = ["strengths-already-here", "use-strengths-wider"];

/** Home 티저에 노출하는 글 (Article 01 · 02 · 08) */
export const HOME_TEASER_SLUGS = [
  "strengths-already-here",
  "slow-is-still-moving",
  "one-small-step"
];

/**
 * "오늘의 한 문장" — 날짜 기반의 결정적 선택.
 * 개인 데이터를 쓰지 않으며 모든 사용자에게 동일하게 표시되는 일반 문장이다.
 */
export function noteOfTheDay(
  energies: string[],
  locale: Locale,
  date = new Date()
): { energy: string; note: string } {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const energy = energies[dayOfYear % energies.length];
  const notes = PUBLIC_CONTENT[locale].energies.notes as Record<string, string>;
  return { energy, note: notes[energy] ?? "" };
}
