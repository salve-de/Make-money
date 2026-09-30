import type { FinancialEntity, SectorCategory } from '@/shared/terminal';
import type { IdeaResearchCase, IdeaResearchOutcome } from '@/shared/idea-research';

/**
 * 入力されたアイデア文と、カタログの各事例（名前・一行説明・タグ・分野）の重なりで似た事例を探す。
 * AI も乱数も使わない。同じカタログと同じ入力なら、いつも同じ順序で同じ結果になる。
 *
 * - 日本語は、漢字・カタカナが続く部分を「文字2-gram」に分けて比べる。ひらがなは助詞や活用が多く
 *   どの事例にも現れるので、区切りとして扱い、比べない。
 * - 英数字は単語で比べる（数字だけの語は比べない）。
 * - 多くの事例に出る語は点を小さく、めずらしい語は点を大きくする（IDF）。ほぼ全件に付くタグ
 *   （「少数精鋭」「高利益率」など）は比べない。
 */

/** 名前に重なれば3点、一行説明・タグは2点、分野は1点。同じ語が複数の項目にあるときは高い方を1回だけ数える。 */
const FIELD_WEIGHT = { name: 3, tagline: 2, tags: 2, sector: 1 } as const;
const MAX_FIELD_WEIGHT = 3;
/** 成功・不明の事例、失敗の事例を、それぞれ何件まで返すか。失敗も目に入るように枠を分ける。 */
export const MAX_NON_FAILURE_CASES = 8;
export const MAX_FAILURE_CASES = 4;
/** 事例の30%を超えて出る語は、どの事例とも重なるので比べない。 */
const MAX_DOCUMENT_SHARE = 0.3;
/** 語のめずらしさ（IDF）を1.5乗する。カタカナ語は2文字ずつに割れて何個も一致するので、めずらしい1語を軽く見ないため。 */
const RARITY_POWER = 1.5;
/** 首位の点の30%に届かない事例は「似ている」に含めない。 */
const MIN_RELATIVE_WEIGHT = 0.3;
/**
 * 首位でもこの点に届かなければ何も返さない。
 * 一行説明で、事例の3%にしか出ない語（IDF≒3.5）が1つ重なった点数を目安にしている。
 */
const MIN_MATCH_WEIGHT = FIELD_WEIGHT.tagline * Math.log(1 + 1 / 0.03) ** RARITY_POWER;

const FAILURE_TAG = /失敗|撤退|破綻|倒産/u;

/** 分野の英字コードだけでは「製造業向け」などの入力と重ならないので、日本語の呼び方も検索語にする。 */
const SECTOR_KEYWORDS: Record<SectorCategory, string> = {
  AI_AUTOMATION: 'AI 自動化 ソフトウェア',
  NICHE_SAAS: 'SaaS ソフトウェア',
  MONOPOLY_MFG: '製造 メーカー',
  CONTENT_MEDIA: 'メディア コンテンツ',
  PHYSICAL_ASSET: '実物 店舗 資産',
  FINTECH_INFRA: '金融 決済 ITサービス',
  LOCAL_SERVICES: '地域 サービス',
  UNKNOWN: '',
};

/** 英小文字・数字（NFKC で全角も半角になり、toLowerCase 済みの文字を渡す）。 */
function isWordCode(code: number): boolean {
  return (code >= 97 && code <= 122) || (code >= 48 && code <= 57);
}

/** 漢字（拡張A・統合・互換）と々〆、カタカナと長音符。ひらがなは含めない。 */
function isContentCode(code: number): boolean {
  return (code >= 0x4e00 && code <= 0x9fff)
    || (code >= 0x30a1 && code <= 0x30fa)
    || code === 0x30fc
    || (code >= 0x3400 && code <= 0x4dbf)
    || (code >= 0xf900 && code <= 0xfaff)
    || code === 0x3005
    || code === 0x3006;
}

/** 入力欄そのものの呼び名で、事業の中身を表さない語。「アイデアです」と書いただけで事例と重なってしまうので、比べない。 */
const GENERIC_PHRASES = ['アイデア'];

/**
 * 文を比べる単位（語）に分ける。3,000件超の事例を初回にまとめて分けるので、
 * 文字種を指定する正規表現ではなく、1文字ずつ見る（この件数では、その方が速い）。
 */
export function tokenize(text: string): Set<string> {
  let normalized = text.normalize('NFKC').toLowerCase();
  for (const phrase of GENERIC_PHRASES) normalized = normalized.replaceAll(phrase, ' ');
  const tokens = new Set<string>();
  let word = '';
  let wordHasLetter = false;
  let previous = '';
  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    if (isWordCode(code)) {
      word += normalized[i];
      if (code >= 97) wordHasLetter = true;
      previous = '';
      continue;
    }
    if (word) {
      if (word.length >= 2 && wordHasLetter) tokens.add(word);
      word = '';
      wordHasLetter = false;
    }
    if (isContentCode(code)) {
      const current = normalized[i];
      if (previous) tokens.add(previous + current);
      previous = current;
    } else {
      previous = '';
    }
  }
  if (word.length >= 2 && wordHasLetter) tokens.add(word);
  return tokens;
}

export function hasConfirmedRevenue(entity: FinancialEntity): boolean {
  const revenue = entity.pnl?.monthlyRevenue;
  return !entity.pnl?.isRevenueUnconfirmed && typeof revenue === 'number' && Number.isFinite(revenue) && revenue > 0;
}

export function classifyOutcome(entity: FinancialEntity): IdeaResearchOutcome {
  if (
    entity.pnl?.financialStatus === 'POST_MORTEM'
    || entity.opportunityJudgment?.verdict === 'HAZARD_REJECT'
    || (entity.tags ?? []).some((tag) => FAILURE_TAG.test(tag))
  ) return 'failure';
  return hasConfirmedRevenue(entity) ? 'success' : 'unknown';
}

/** 売上が確認できている事例だけ、台帳のラベルをそのまま返す。金額は作らない。 */
export function confirmedRevenueLabel(entity: FinancialEntity): string | null {
  if (!hasConfirmedRevenue(entity)) return null;
  const label = entity.pnl?.revenueLabel;
  return typeof label === 'string' && label.trim() ? label.trim() : null;
}

interface CatalogIndex {
  size: number;
  /** 語 → その語を含む事例の「番号 × 4 + 項目の重み」。項目の重みは最大3なので2ビットに収まる。 */
  postings: Map<string, number[]>;
}

const indexCache = new WeakMap<readonly FinancialEntity[], CatalogIndex>();

function documentTokens(entity: FinancialEntity): Map<string, number> {
  const weights = new Map<string, number>();
  const add = (text: string | undefined, weight: number) => {
    if (!text) return;
    for (const token of tokenize(text)) {
      if ((weights.get(token) ?? 0) < weight) weights.set(token, weight);
    }
  };
  add(entity.name, FIELD_WEIGHT.name);
  add(entity.tagline, FIELD_WEIGHT.tagline);
  add((entity.tags ?? []).join(' '), FIELD_WEIGHT.tags);
  add(`${entity.sector ?? ''} ${SECTOR_KEYWORDS[entity.sector] ?? ''}`.replace(/_/g, ' '), FIELD_WEIGHT.sector);
  return weights;
}

function buildIndex(entities: readonly FinancialEntity[]): CatalogIndex {
  const postings = new Map<string, number[]>();
  entities.forEach((entity, position) => {
    for (const [token, weight] of documentTokens(entity)) {
      const list = postings.get(token);
      const entry = position * 4 + weight;
      if (list) list.push(entry);
      else postings.set(token, [entry]);
    }
  });
  return { size: entities.length, postings };
}

/** カタログの配列ごとに1回だけ作る（本番では同じ配列を使い回すので、最初の1件目の検索だけ時間がかかる）。 */
function indexFor(entities: readonly FinancialEntity[]): CatalogIndex {
  let index = indexCache.get(entities);
  if (!index) {
    index = buildIndex(entities);
    indexCache.set(entities, index);
  }
  return index;
}

const rarity = (size: number, matches: number) => Math.log(1 + size / matches) ** RARITY_POWER;

interface Ranked {
  entity: FinancialEntity;
  outcome: IdeaResearchOutcome;
  weight: number;
}

function byRank(a: Ranked, b: Ranked): number {
  if (a.weight !== b.weight) return b.weight - a.weight;
  return a.entity.id < b.entity.id ? -1 : a.entity.id > b.entity.id ? 1 : 0;
}

/**
 * 似た事例を返す。成功・不明は上位 MAX_NON_FAILURE_CASES 件、失敗は上位 MAX_FAILURE_CASES 件まで。
 * 返す順は似ている順（同点は id の昇順）。score は、入力の語の点のうち、その事例と重なった点の割合（0〜100）。
 */
export function findSimilarCases(entities: readonly FinancialEntity[], idea: string): IdeaResearchCase[] {
  const queryTokens = tokenize(idea);
  if (queryTokens.size === 0 || entities.length === 0) return [];
  const index = indexFor(entities);

  const matched = new Map<number, number>();
  let possible = 0;
  for (const token of queryTokens) {
    const list = index.postings.get(token);
    if (list && list.length / index.size > MAX_DOCUMENT_SHARE) continue;
    // どの事例にも無い語は、最もめずらしい語として分母にだけ入れる（入力のうち事例で確かめられない部分を score に反映する）。
    const points = rarity(index.size, list?.length ?? 1);
    possible += points * MAX_FIELD_WEIGHT;
    for (const entry of list ?? []) {
      const position = entry >> 2;
      matched.set(position, (matched.get(position) ?? 0) + points * (entry & 3));
    }
  }

  let top = 0;
  for (const weight of matched.values()) top = Math.max(top, weight);
  if (top < MIN_MATCH_WEIGHT) return [];
  const floor = Math.max(MIN_MATCH_WEIGHT, top * MIN_RELATIVE_WEIGHT);

  const ranked: Ranked[] = [];
  for (const [position, weight] of matched) {
    if (weight < floor) continue;
    const entity = entities[position];
    ranked.push({ entity, outcome: classifyOutcome(entity), weight });
  }
  ranked.sort(byRank);

  const picked = [
    ...ranked.filter((item) => item.outcome !== 'failure').slice(0, MAX_NON_FAILURE_CASES),
    ...ranked.filter((item) => item.outcome === 'failure').slice(0, MAX_FAILURE_CASES),
  ].sort(byRank);

  return picked.map(({ entity, outcome, weight }) => ({
    id: entity.id,
    name: entity.name,
    tagline: entity.tagline,
    sector: entity.sector,
    outcome,
    monthlyRevenueLabel: confirmedRevenueLabel(entity),
    score: Math.round((weight / possible) * 1000) / 10,
  }));
}
