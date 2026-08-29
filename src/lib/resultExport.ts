/**
 * 결과 내보내기 (Markdown / 일반 텍스트).
 *
 * 성격
 *   저장된 결과를 **읽기만** 해서 문자열을 만드는 순수 함수 모음이다.
 *   앱 상태·localStorage·세션·채점 결과를 건드리지 않고, 네트워크도 쓰지 않는다.
 *
 * 언어
 *   화면 locale 과 무관하게 내보낼 언어를 인자로 받는다.
 *   유형 콘텐츠는 저장된 `code` 로 조회한 뒤 해당 언어 overlay 를 입힌다
 *   (저장 시점의 `typePersonaName` 은 표시 출처로 쓰지 않는다).
 *   에너지·축 이름은 내부 한국어 key 를 그대로 두고 표시명만 매핑한다.
 */
import { AXES, matchType, publicInterpretationNote, BRAND } from "./mycore12";
import type { StoredAssessmentResult } from "./storage";
import { localizeType } from "../i18n/content";
import {
  UI,
  axisLabel,
  energyLabel,
  fill,
  LOCALE_TAG,
  type Locale
} from "../i18n/resources";

export type ExportFormat = "md" | "txt";

export interface ExportFile {
  filename: string;
  mime: string;
  content: string;
}

/** 파일명용 날짜 (YYYY-MM-DD, 로컬 기준) */
const dateStamp = (iso: string): string => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * Markdown 특수문자 이스케이프.
 * 현재 데이터에는 해당 문자가 없지만, 값이 바뀌어도 문서 구조가 깨지지 않게 한다.
 */
const mdEscape = (s: string): string => s.replace(/([\\`*_{}[\]#|])/g, "\\$1");

interface Section {
  title: string;
  /** 문단 (장문) */
  paragraphs?: string[];
  /** 목록 */
  items?: string[];
  /** 소제목이 있는 하위 블록 */
  blocks?: { title: string; paragraphs?: string[]; items?: string[] }[];
}

/** 화면과 같은 순서로 내보낼 내용을 조립한다 */
function buildSections(
  stored: StoredAssessmentResult,
  locale: Locale
): { header: string[]; sections: Section[]; footer: string[] } {
  const t = UI[locale];
  const type = localizeType(matchType(stored.code), locale);
  const e = (k: string) => energyLabel(k, locale);

  const completed = new Date(stored.completedAt).toLocaleString(
    LOCALE_TAG[locale]
  );
  const length = stored.assessmentLength ?? 36;

  const header = [
    fill(t.result.date, { date: completed }),
    fill(t.result.questionCount, { count: length }) +
      (length === 36 ? ` ${t.result.standard}` : "")
  ];

  // 6축 · 12에너지 — 축마다 두 에너지의 합은 항상 100
  const energyBlocks = AXES.map(a => ({
    title: axisLabel(a.axis, locale),
    items: [
      `${e(a.pole1)}: ${stored.energyScores[a.pole1]}`,
      `${e(a.pole0)}: ${stored.energyScores[a.pole0]}`
    ]
  }));

  const sections: Section[] = [
    { title: t.result.core, paragraphs: [type.overview] },
    { title: t.result.energy, blocks: energyBlocks },
    { title: t.result.strengths, items: type.strengths },
    {
      title: t.result.work,
      blocks: [
        { title: t.result.workStyle, paragraphs: [type.workStyle] },
        { title: t.result.goodFit, items: type.goodFitSituations }
      ]
    },
    { title: t.result.judgment, paragraphs: [type.decisionStyle] },
    {
      title: t.result.people,
      paragraphs: [type.relationshipStyle],
      blocks: [
        { title: t.result.worksWell, items: type.collaborationGuide.worksWellWhen },
        { title: t.result.watch, items: type.collaborationGuide.mayStruggleWhen },
        {
          title: t.result.feedback,
          paragraphs: [type.collaborationGuide.bestFeedbackStyle]
        },
        { title: t.result.team, paragraphs: [type.teamContribution] }
      ]
    },
    { title: t.result.signals, items: type.cautions },
    {
      title: t.result.wider,
      blocks: type.developmentGuide.map(g => ({
        title: `${e(g.primaryEnergy)} + ${e(g.supportEnergy)}`,
        paragraphs: [
          fill(t.result.addEnergy, { energy: e(g.supportEnergy) }) +
            ` — ${g.whyItHelps}`,
          `${t.result.notice} — ${g.overuseSignal}`,
          `${t.result.practice} — ${g.practice}`,
          `${t.result.mature} — ${g.matureStrength}`
        ]
      }))
    },
    {
      title: t.result.roadmap,
      blocks: [
        { title: t.result.startNow, paragraphs: [type.developmentRoadmap.startNow] },
        { title: t.result.next30, paragraphs: [type.developmentRoadmap.next30Days] },
        { title: t.result.longTerm, paragraphs: [type.developmentRoadmap.longTerm] }
      ]
    },
    { title: t.result.stress, items: type.stressSignals },
    { title: t.result.recovery, items: type.recoveryStrategies },
    { title: t.result.questions, items: type.selfCoachingQuestions },
    { title: t.result.closing, paragraphs: [type.encouragement] }
  ];

  const footer = [
    publicInterpretationNote(type.interpretationNote),
    t.result.validationNote,
    BRAND.copyright + (locale === "ko" ? ` ${BRAND.copyrightKo}` : "")
  ];

  return { header, sections, footer };
}

/** 유형 제목 부분 (personaName / headline / energySignature) */
function titleBlock(stored: StoredAssessmentResult, locale: Locale) {
  const type = localizeType(matchType(stored.code), locale);
  const signature = type.axisPreferences
    .map(ap => energyLabel(ap.preferredEnergy, locale))
    .join(" · ");
  return { personaName: type.personaName, headline: type.headline, signature };
}

/** Markdown 본문 */
export function buildMarkdown(
  stored: StoredAssessmentResult,
  locale: Locale
): string {
  const t = UI[locale];
  const { header, sections, footer } = buildSections(stored, locale);
  const { personaName, headline, signature } = titleBlock(stored, locale);
  const out: string[] = [];

  out.push(`# ${BRAND.nameEn} — ${t.result.resultLabel}`, "");
  out.push(...header.map(h => `- ${h}`), "");
  out.push(`## ${mdEscape(personaName)}`, "");
  out.push(mdEscape(headline), "");
  out.push(`*${mdEscape(signature)}*`, "");

  for (const s of sections) {
    out.push(`## ${mdEscape(s.title)}`, "");
    for (const p of s.paragraphs ?? []) out.push(mdEscape(p), "");
    for (const i of s.items ?? []) out.push(`- ${mdEscape(i)}`);
    if (s.items?.length) out.push("");
    for (const b of s.blocks ?? []) {
      out.push(`### ${mdEscape(b.title)}`, "");
      for (const p of b.paragraphs ?? []) out.push(mdEscape(p), "");
      for (const i of b.items ?? []) out.push(`- ${mdEscape(i)}`);
      if (b.items?.length) out.push("");
    }
  }

  out.push("---", "");
  for (const f of footer) out.push(mdEscape(f), "");

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

/** 일반 텍스트 본문 (Markdown 기호 없음) */
export function buildPlainText(
  stored: StoredAssessmentResult,
  locale: Locale
): string {
  const t = UI[locale];
  const { header, sections, footer } = buildSections(stored, locale);
  const { personaName, headline, signature } = titleBlock(stored, locale);
  const out: string[] = [];

  const title = `${BRAND.nameEn} — ${t.result.resultLabel}`;
  out.push(title, "=".repeat(Math.min(title.length, 60)), "");
  out.push(...header, "");
  out.push(personaName, "-".repeat(Math.min(personaName.length, 60)), "");
  out.push(headline, "", signature, "");

  for (const s of sections) {
    out.push("", s.title.toUpperCase(), "-".repeat(Math.min(s.title.length, 60)), "");
    for (const p of s.paragraphs ?? []) out.push(p, "");
    for (const i of s.items ?? []) out.push(`  - ${i}`);
    if (s.items?.length) out.push("");
    for (const b of s.blocks ?? []) {
      out.push(`[${b.title}]`);
      for (const p of b.paragraphs ?? []) out.push(p, "");
      for (const i of b.items ?? []) out.push(`  - ${i}`);
      out.push("");
    }
  }

  out.push("", "-".repeat(60), "");
  for (const f of footer) out.push(f, "");

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

/**
 * 내보낼 파일 하나를 만든다.
 * txt 는 Windows 메모장에서 한국어가 깨지지 않도록 UTF-8 BOM 을 붙인다.
 */
export function buildExportFile(
  stored: StoredAssessmentResult,
  locale: Locale,
  format: ExportFormat
): ExportFile {
  const body =
    format === "md"
      ? buildMarkdown(stored, locale)
      : buildPlainText(stored, locale);

  return {
    filename: `MYCORE12_result_${dateStamp(stored.completedAt)}_${locale}.${format}`,
    mime:
      format === "md"
        ? "text/markdown;charset=utf-8"
        : "text/plain;charset=utf-8",
    content: format === "txt" ? `\uFEFF${body}` : body
  };
}

/** 브라우저에서 파일로 저장한다 (서버 전송 없음) */
export function downloadExport(file: ExportFile): void {
  const blob = new Blob([file.content], { type: file.mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
