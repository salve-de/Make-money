import type { AnalysisItem, ReaderAnalysis, ReaderCase, ReaderFact, ReaderMetric } from '@/shared/reader-case';
import type { FinancialEntity } from '@/shared/terminal';
import { firstSentence, pickListMetric, plainAnalysisText, plainFactText, readerSummaryFact } from '@/shared/display-text';
import { checkLead } from '@/shared/lead-standard';
import { clipAtClause, createSentenceMemory, splitSentences } from '@/shared/case-text';
import { UI } from '@/shared/ui-strings';

/**
 * 詳細画面の「何を・どの順で出すか」を決める（描画しない）。
 * 身元カード（社名・何の事業か・数字の帯・見どころ）と、目次つきの区画（概要・稼ぎ方・客・勝因・経緯）に分ける。
 * 画面の文字は事実・推論の原文から作り、同じ文・ほぼ同じ文は2回出さない。
 */

export const HIGHLIGHT_MAX = 60;
export const WHAT_MAX = 40;
const PRICE_MAX = 40;

export type SectionId = 'section-overview' | 'section-money' | 'section-customers' | 'section-edge' | 'section-story' | 'section-basis';

export interface CardPlan {
  /** 何の事業か（概要の事実の1文目、40字以内） */
  what: { factId: string; text: string; clipped: boolean } | null;
  revenue: ReaderMetric | null;
  price: { factId: string; text: string; clipped: boolean } | null;
  team: string | null;
  founded: { text: string; factId?: string } | null;
  highlight: { analysisId: string; text: string; clipped: boolean; inferenceAnalysis: ReaderAnalysis } | null;
}

export interface SectionItem {
  key: string;
  label?: string;
  /** 事実なら fact、推論なら analysis。screen-text の出どころ検査に使う属性の名前と値 */
  owner: { attr: 'data-fact' | 'data-analysis' | 'data-fact-part'; id: string };
  analysis?: ReaderAnalysis;
  sentences: string[];
  /** 出典番号（事実のみ） */
  sourceId?: string;
  /** 物語の段（前夜・隙…）の見出し */
  step?: string;
}

export interface DetailSection {
  id: SectionId;
  title: string;
  items: SectionItem[];
}

/** 推論を、読む人の問い（どう稼ぐ・誰から・なぜ勝てる・いま真似できるか）の順に並べる。 */
const ANALYSIS_GROUPS: Array<{ title: string; items: AnalysisItem[] }> = [
  { title: UI.GROUP_MONEY, items: ['BUSINESS_MODEL', 'PRICING', 'REVENUE_ESTIMATE', 'COST_STRUCTURE', 'TAKE_HOME', 'UPFRONT_CASH', 'CAPITAL_AND_TEAM'] },
  { title: UI.GROUP_CUSTOMERS, items: ['CUSTOMER', 'CUSTOMER_PAIN', 'FIRST_CUSTOMERS', 'CHANNELS', 'REFERRAL'] },
  { title: UI.GROUP_EDGE, items: ['WHY_IT_WORKED', 'INCUMBENT_BLINDSPOT', 'LOCK_IN', 'COMPETITION', 'DEPENDENCIES', 'TOOLS'] },
  { title: UI.GROUP_NOW, items: ['VIABILITY', 'TIMELINE', 'PIVOTS', 'FAILURE_CAUSE', 'LESSON'] },
];

const byItem = (reader: ReaderCase, item: AnalysisItem) => reader.analysis.find((a) => a.item === item);

function yearOf(text: string): string | null {
  const m = /(19|20)\d{2}年/.exec(text);
  return m ? m[0] : null;
}

export function planCard(entity: Partial<Pick<FinancialEntity, 'temporal' | 'operations'>>, reader: ReaderCase): CardPlan {
  const summary = readerSummaryFact(reader);
  let what: CardPlan['what'] = null;
  if (summary) {
    const first = firstSentence(plainFactText(summary.text));
    const clip = clipAtClause(first, WHAT_MAX);
    what = { factId: summary.id, text: clip.text, clipped: clip.clipped };
  }
  const revenue = pickListMetric(reader);
  const priceFacts = reader.facts.filter((f) => f.kind === 'PRICING' && f.id !== reader.summaryFactId);
  const priceFact: ReaderFact | undefined = priceFacts.find((f) => f.text.startsWith('現在')) ?? priceFacts[0];
  let price: CardPlan['price'] = null;
  if (priceFact) {
    const clip = clipAtClause(firstSentence(plainFactText(priceFact.text)), PRICE_MAX);
    price = { factId: priceFact.id, text: clip.text, clipped: clip.clipped };
  }
  const ops = entity.operations;
  const team = ops && ops.teamSize > 0 && !ops.isTeamSizeUnconfirmed ? `${ops.teamSize.toLocaleString('ja-JP')}人` : null;
  let founded: CardPlan['founded'] = null;
  const foundedYear = entity.temporal?.foundedYear ?? 0;
  if (foundedYear > 0) founded = { text: `${foundedYear}年` };
  else {
    const fact = reader.facts.find((f) => f.kind === 'FOUNDING');
    const year = fact ? yearOf(fact.text) : null;
    if (fact && year) founded = { text: year, factId: fact.id };
  }
  const headline = byItem(reader, 'HEADLINE');
  let highlight: CardPlan['highlight'] = null;
  if (headline && checkLead(headline, reader).ok) {
    const clip = clipAtClause(plainAnalysisText(headline.text), HIGHLIGHT_MAX);
    highlight = { analysisId: headline.id, text: clip.text, clipped: clip.clipped, inferenceAnalysis: headline };
  }
  return { what, revenue, price, team, founded, highlight };
}

const FACT_HOME: Record<ReaderFact['kind'], SectionId> = {
  DESCRIPTION: 'section-overview',
  PRICING: 'section-money',
  FUNDING: 'section-money',
  EXIT: 'section-money',
  CHANNEL: 'section-customers',
  TOOL: 'section-edge',
  FOUNDING: 'section-story',
  TEAM: 'section-story',
  EVENT: 'section-story',
  OTHER: 'section-story',
};

const GROUP_HOME: Record<string, SectionId> = {
  [UI.GROUP_MONEY]: 'section-money',
  [UI.GROUP_CUSTOMERS]: 'section-customers',
  [UI.GROUP_EDGE]: 'section-edge',
  [UI.GROUP_NOW]: 'section-story',
};

const TITLES: Record<Exclude<SectionId, 'section-basis'>, string> = {
  'section-overview': UI.SEC_OVERVIEW,
  'section-money': UI.SEC_MONEY,
  'section-customers': UI.SEC_CUSTOMERS,
  'section-edge': UI.SEC_EDGE,
  'section-story': UI.SEC_STORY,
};

/** 物語「前夜：…。隙：…。突破：…。金が回る仕組み：…」を段ごとの文にする。形が違えば null。 */
const STORY_STEPS = ['前夜', '隙', '突破', '金が回る仕組み'] as const;
function storySteps(text: string): Array<{ step: string; body: string }> | null {
  const marks = [...text.matchAll(new RegExp(`(${STORY_STEPS.join('|')})[:：]`, 'g'))];
  if (marks.length !== STORY_STEPS.length || marks.some((m, i) => m[1] !== STORY_STEPS[i])) return null;
  return marks.map((m, i) => ({
    step: m[1],
    body: text.slice((m.index ?? 0) + m[0].length, i + 1 < marks.length ? marks[i + 1].index : undefined).trim(),
  }));
}

export function planSections(reader: ReaderCase, card: CardPlan): DetailSection[] {
  const memory = createSentenceMemory();
  const sections = new Map<SectionId, SectionItem[]>(
    (Object.keys(TITLES) as Array<keyof typeof TITLES>).map((id) => [id, []]),
  );
  // 身元カードに出した文は、同じ文を下で繰り返さない（記憶に入れておく）
  const cardTexts = [card.what?.text, card.price?.text, card.highlight?.text];
  for (const t of cardTexts) if (t) memory.take(t.replace(/…$/, ''));

  const push = (home: SectionId, item: Omit<SectionItem, 'sentences'>, rawSentences: string[], skipFirst = false) => {
    const sentences = rawSentences.slice(skipFirst ? 1 : 0).filter((s) => memory.take(s));
    if (sentences.length === 0) return;
    sections.get(home as keyof typeof TITLES)?.push({ ...item, sentences });
  };

  // 概要: 概要の事実のうち、身元カードに出さなかった分
  const summary = readerSummaryFact(reader);
  if (summary) {
    const sentences = splitSentences(plainFactText(summary.text));
    push('section-overview', { key: `fact-${summary.id}`, owner: { attr: 'data-fact-part', id: summary.id }, sourceId: summary.sourceId }, sentences, !card.what?.clipped);
  }

  const analysisSkip = new Set<string>(['HEADLINE']);
  const ordered = new Map<SectionId, ReaderAnalysis[]>();
  for (const { title, items } of ANALYSIS_GROUPS) {
    const home = GROUP_HOME[title];
    const rows = items.flatMap((item) => reader.analysis.filter((a) => a.item === item && !analysisSkip.has(a.item)));
    ordered.set(home, rows);
  }
  const storyAnalysis = byItem(reader, 'STORY');

  // 事実（概要以外）を先に、推論を後に。事実は出典つきなので、読み手が確かめやすい
  for (const fact of reader.facts) {
    if (fact.id === reader.summaryFactId) continue;
    const home = FACT_HOME[fact.kind];
    const skipFirst = card.price?.factId === fact.id && !card.price.clipped;
    const sentences = splitSentences(plainFactText(fact.text));
    const label = home === 'section-overview' ? undefined : undefined;
    push(home, { key: `fact-${fact.id}`, label, owner: { attr: card.price?.factId === fact.id ? 'data-fact-part' : 'data-fact', id: fact.id }, sourceId: fact.sourceId }, sentences, skipFirst);
  }

  if (storyAnalysis) {
    const steps = storySteps(storyAnalysis.text);
    if (steps) {
      steps.forEach(({ step, body }, i) => push('section-story', { key: `story-${i}`, label: undefined, step, owner: { attr: i === 0 ? 'data-analysis' : 'data-fact-part', id: storyAnalysis.id }, analysis: storyAnalysis }, splitSentences(body)));
    } else {
      push('section-story', { key: `analysis-${storyAnalysis.id}`, owner: { attr: 'data-analysis', id: storyAnalysis.id }, analysis: storyAnalysis }, splitSentences(plainAnalysisText(storyAnalysis.text)));
    }
  }
  for (const [home, rows] of ordered) {
    for (const a of rows) {
      push(home, { key: `analysis-${a.id}`, label: undefined, owner: { attr: 'data-analysis', id: a.id }, analysis: a }, splitSentences(plainAnalysisText(a.text)));
    }
  }

  return (Object.keys(TITLES) as Array<keyof typeof TITLES>)
    .map((id): DetailSection => ({ id, title: TITLES[id], items: sections.get(id) ?? [] }))
    .filter((section) => section.items.length > 0);
}

/** 目次に出す区画。根拠の区画（数値・計算・出典）があれば末尾に足す。 */
export function planNav(sections: readonly DetailSection[], hasBasis: boolean): Array<{ id: SectionId; title: string }> {
  const nav = sections.map(({ id, title }) => ({ id, title }));
  if (hasBasis) nav.push({ id: 'section-basis', title: UI.SEC_BASIS });
  return nav;
}
