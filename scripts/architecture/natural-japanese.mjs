/**
 * 日本語の自然さの関門（機械の側）。画面に出る文から、話し言葉・業界のくだけた言い回し・不自然な動詞の使い方を見つける。
 * 辞書は data/natural-japanese.json（語ごとに pattern・reason・suggest、正当な使い方を外す allow）。
 * 使う所: scripts/architecture/check-case-text-standard.mjs（pnpm lint・case-text:verify）、
 *        scripts/reader-case/build-display.ts（画面の層の作り直しの対象選び）、scripts/architecture/report-natural-japanese.mjs（件数の集計）。
 * 「資金が回る」「利益を広告に回した」のような正当な使い方は、各語の allow（その範囲に当たりが収まれば外す）で除く。
 */
import { readFileSync } from 'node:fs';

/**
 * @typedef {{ pattern: string; reason: string; suggest: string[]; allow?: string[]; bad?: string; good?: string }} NaturalRule
 * @typedef {{ re: RegExp; allow: RegExp[]; reason: string; suggest: string[] }} CompiledRule
 * @typedef {{ word: string; index: number; reason: string; suggest: string[] }} NaturalHit
 */

/** @param {NaturalRule[]} rules @returns {CompiledRule[]} */
export function compileNaturalRules(rules) {
  return rules.map((rule) => ({
    re: new RegExp(rule.pattern, 'gu'),
    allow: (rule.allow ?? []).map((pattern) => new RegExp(pattern, 'gu')),
    reason: rule.reason,
    suggest: rule.suggest,
  }));
}

/** @param {string} file @returns {CompiledRule[]} */
export function loadNaturalRules(file) {
  return compileNaturalRules(JSON.parse(readFileSync(file, 'utf8')));
}

/** 当たり [start, end) が、許可の形のどれかの範囲に収まっているか */
function excused(text, start, end, allow) {
  for (const re of allow) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      if (m.index <= start && end <= m.index + m[0].length) return true;
    }
  }
  return false;
}

/** @param {string} text @param {CompiledRule[]} rules @returns {NaturalHit[]} */
export function findUnnatural(text, rules) {
  if (typeof text !== 'string' || !text) return [];
  /** @type {NaturalHit[]} */
  const hits = [];
  for (const rule of rules) {
    rule.re.lastIndex = 0;
    for (const m of text.matchAll(rule.re)) {
      if (excused(text, m.index, m.index + m[0].length, rule.allow)) continue;
      hits.push({ word: m[0], index: m.index, reason: rule.reason, suggest: rule.suggest });
    }
  }
  return hits.sort((a, b) => a.index - b.index);
}

/** 落ちた時に出す1行（何に直すかまで） @param {NaturalHit} hit */
export const describeHit = (hit) => `不自然な言い回し「${hit.word}」（${hit.reason}）→ ${hit.suggest.join('／')}`;

// 読む人が知りたい事以外はノイズ（docs/CASE_TEXT_STANDARD.md「欄ごとに読む人が知りたいこと」）。機械で測れる分だけ見る。
// 料金＝いくらで何が使えるか。意味の通らないプラン名（「Sedanが月5,000ルピー」）と、税・別料金・返金などの付帯条件は出さない。
const PLAIN_PLAN = new Set(['Free', 'Pro', 'Plus', 'Basic', 'Premium', 'Team', 'Team Pro', 'Business', 'Enterprise', 'Starter', 'Personal']);
const PLAN_NAME = /(?<![A-Za-z:：])([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)*)(?![A-Za-z]|\s?[:：（(])[^。、:：\d]{0,8}[\d,.]+\s*(?:ドル|円|ルピー|ユーロ|ポンド|万円)/g;
const NAMED_PLAN = /(?:プラン名\s?([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)*)|([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)*)\s?プラン)/g;
const PRICE_EXTRAS = /(返金|税込|税抜|消費税|GST|VAT|別料金|別途)/;
/**
 * 読む人がその欄で知りたい事ではない情報（意味の通らないプラン名、料金の欄の付帯条件）を見つける。
 * @param {string} text @param {{ price?: boolean }} [opts] price: 料金の欄（PRICING・章の price）
 * @returns {string[]}
 */
export function findNoise(text, { price = false } = {}) {
  /** @type {string[]} */
  const problems = [];
  if (typeof text !== 'string') return problems;
  const names = [...text.matchAll(NAMED_PLAN)].map((m) => m[1] ?? m[2]);
  if (price) names.push(...[...text.matchAll(PLAN_NAME)].map((m) => m[1]));
  for (const name of new Set(names)) {
    if (!PLAIN_PLAN.has(name)) problems.push(`意味の通らないプラン名「${name}」（読む人が知りたいのは、いくらで何が使えるか。人数・回数・機能で言う）`);
  }
  const extra = price ? text.match(PRICE_EXTRAS) : null;
  if (extra) problems.push(`料金に付帯条件「${extra[0]}」（税・別料金・返金は読む人が料金で知りたい事ではない。消す）`);
  return problems;
}
