import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../i18n/useI18n";
import { PUBLIC_CONTENT, STORIES } from "../i18n/publicContent";
import { UI } from "../i18n/resources";

const setMeta = (selector: string, value: string) => {
  const el = document.querySelector(selector);
  if (el) el.setAttribute("content", value);
};

/**
 * route 별 title / description 갱신.
 *
 * LocaleProvider 는 locale 이 바뀔 때 기본(홈) metadata 를 적용한다.
 * 이 컴포넌트는 그 위에서 현재 경로에 맞는 값으로 덮어쓴다.
 * canonical 은 언어별 URL 이 없으므로 정적 index.html 값(루트)을 그대로 둔다.
 */
export default function RouteMeta() {
  const { pathname } = useLocation();
  const { locale } = useI18n();
  // Routes 바깥에서 렌더되므로 useParams 대신 경로에서 직접 slug 를 읽는다
  const slug = pathname.startsWith("/stories/")
    ? pathname.slice("/stories/".length).split("/")[0]
    : undefined;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const pub = PUBLIC_CONTENT[locale];
    const stories = STORIES[locale];
    const home = UI[locale].meta;

    let title = home.title;
    let description = home.description;

    if (pathname.startsWith("/about")) {
      title = pub.meta.about.title;
      description = pub.meta.about.description;
    } else if (pathname.startsWith("/energies")) {
      title = pub.meta.energies.title;
      description = pub.meta.energies.description;
    } else if (pathname.startsWith("/how")) {
      title = pub.meta.how.title;
      description = pub.meta.how.description;
    } else if (pathname.startsWith("/guide")) {
      title = pub.meta.guide.title;
      description = pub.meta.guide.description;
    } else if (pathname.startsWith("/changelog")) {
      title = pub.meta.changelog.title;
      description = pub.meta.changelog.description;
    } else if (pathname.startsWith("/stories")) {
      const article = slug
        ? stories.articles.find(a => a.slug === slug)
        : undefined;
      title = article ? article.seoTitle : stories.meta.hubTitle;
      description = article ? article.seoDescription : stories.meta.hubDescription;
    }

    document.title = title;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
  }, [pathname, slug, locale]);

  return null;
}
