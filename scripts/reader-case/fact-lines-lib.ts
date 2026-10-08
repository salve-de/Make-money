/**
 * 事実の記録の文を読む人向けに言い直す段（画面の層）の、AIを使わない部品。
 * 対象の洗い出し・機械の照合・data/fact-lines.json への差し替えをここにまとめ、試験できるようにする。
 * 呼び出し元: scripts/reader-case/build-fact-lines.ts（pnpm fact-lines:build）。検査は scripts/architecture/check-case-text-standard.mjs。
 */
import { textFingerprint } from '../../src/shared/text-fingerprint';
import { FACT_SECTIONS } from '../../src/shared/ui-strings';
import type { ReaderCase } from '../../src/shared/reader-case';
import { factTokens } from './paraphrase-check';

export type FactLineKind = 'fact' | 'basis' | 'period' | 'formula' | 'analysis';
export type StoredKind = FactLineKind | 'labels';
export interface FactLineEntry { entityId: string; kind: StoredKind; targetId: string; hash: string; text: string }

/** 画面に出る欄の対象1件。key は AI に渡す名前（kind:targetId） */
export interface FactTarget { key: string; kind: FactLineKind; targetId: string; where: string; original: string; max: number }

/** 数字の帯の「料金」は70字まで（scripts/reader-view/rules.mjs PRICE_MAX。円換算の（約…）を除く） */
export const PRICE_MAX = 70;
export const MAX_LEN: Record<FactLineKind, number> = { fact: 200, basis: 70, period: 40, formula: 280, analysis: 150 };

// 画面（ReaderDetail.tsx の BOILERPLATE_FORMULA）が出さない式は、言い直さない
const BOILERPLATE_FORMULA = /^数字は出典に載っている値$|そのまま(?:載せた|記載|載せ)|計算は(?:ない|無い)/;
// 帯（ReaderOverview.tsx の planKeyStrip）に出る推論
const STRIP_ITEMS = new Set(['REVENUE_ESTIMATE', 'PRICING', 'TAKE_HOME']);

const sectionTitle = (kind: string): string => FACT_SECTIONS.find((s) => s.kind === kind)?.title ?? '補足';

/** 画面に読む人向けでない記録の文をそのまま出している欄を、全部洗い出す。 */
export function collectTargets(reader: ReaderCase): FactTarget[] {
  const out: FactTarget[] = [];
  for (const f of reader.facts) {
    if (f.id === reader.summaryFactId) continue; // 概要は list-lines・summary-lines が受け持つ
    out.push({ key: `fact:${f.id}`, kind: 'fact', targetId: f.id, where: `出典を見る > ${sectionTitle(f.kind)}${f.kind === 'PRICING' ? '（料金の帯にも出る）' : ''}`, original: f.text, max: f.kind === 'PRICING' ? PRICE_MAX : MAX_LEN.fact });
  }
  for (const m of reader.metrics) {
    // 期間の列は「2019年5月1日の投稿（月の売上70K）」のように記録の言い方が混ざる事がある。日付・年・年度だけの期間は直さない
    if (m.period && !/^[\d年月日度〜~\-–/\s.]+$/.test(m.period.normalize('NFKC'))) out.push({ key: `period:${m.id}`, kind: 'period', targetId: m.id, where: `数値の表 > 「${m.label ?? m.measure}」の期間の列`, original: m.period, max: MAX_LEN.period });
    if (m.basis) out.push({ key: `basis:${m.id}`, kind: 'basis', targetId: m.id, where: `数値の表 > 「${m.label ?? m.measure}」の注記`, original: m.basis, max: MAX_LEN.basis });
  }
  for (const a of reader.analysis) {
    if (a.formula && !BOILERPLATE_FORMULA.test(a.formula.trim())) out.push({ key: `formula:${a.id}`, kind: 'formula', targetId: a.id, where: `計算の前提 > ${a.item}`, original: a.formula, max: MAX_LEN.formula });
    if (STRIP_ITEMS.has(a.item)) out.push({ key: `analysis:${a.id}`, kind: 'analysis', targetId: a.id, where: `冒頭の数字の帯 > ${a.item}`, original: a.text, max: a.item === 'PRICING' ? PRICE_MAX : MAX_LEN.analysis });
  }
  return out;
}

/** 元の文の日付を日本語の形でも「元にある語」として数える（「2026-06-25」→「2026年」「6月」「25日」） */
function dateTokens(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/g)) {
    out.push(`${m[1]}年`, `${Number(m[2])}月`);
    if (m[3]) out.push(`${Number(m[3])}日`);
  }
  return out;
}

/**
 * 言い直した文に、元に無い数字・年・名前が入っていないか。
 * 数字（金額・率・人数・年月日。単位つき）は、この文の元の文にあるものだけ。
 * 英字・カタカナの名前は、元の文か、同じ事例の他の文（haystack）にあるものだけ。円はコードで付けるので、AIが書いたら落とす。
 */
export function newTokens(edited: string, original: string, haystack: string): string[] {
  const known = new Set([...factTokens(original), ...dateTokens(original)]);
  // 数え方の単位（社・人・件…）は、同じ数が元の文に（英語の「44 of the …」のように単位なしでも）あれば、日本語の単位を付けてよい
  const knownDigits = new Set([...known].map((t) => /^(\d+(?:\.\d+)?)/.exec(t)?.[1]).filter((d): d is string => Boolean(d)));
  const hay = haystack.normalize('NFKC').toLowerCase();
  return factTokens(edited).filter((tok) => {
    if (known.has(tok)) return false;
    const count = /^(\d+(?:\.\d+)?)(?:社|件|人|個|本|回|店|国|校|台|曲|つ)$/.exec(tok);
    if (count && knownDigits.has(count[1])) return false;
    if (/^[$¥€£₹]?\d/.test(tok)) return true;
    // 日本語の普通の外来語は、名前ではないので照合しない（名前の取り違えは確認役が見る）
    if (COMMON_KATAKANA.has(tok)) return false;
    return !hay.includes(tok.toLowerCase());
  });
}

const COMMON_KATAKANA = new Set(['プラン', 'ベンチャー', 'ソフト', 'ツール', 'サービス', 'サイト', 'ページ', 'データ', 'アプリ', 'ユーザー', 'ブランド', 'コンテンツ', 'チーム', 'ビジネス', 'ネット', 'ネットワーク', 'システム', 'ソフトウェア', 'クラウド', 'メール', 'ファイル', 'テーマ', 'フォント', 'デザイン', 'ライセンス', 'パートナー', 'ブログ', 'ニュース', 'コミュニティ', 'マーケティング', 'ビデオ', 'アカウント', 'メンバー', 'キャンペーン', 'レビュー', 'サポート', 'オンライン', 'デジタル', 'リスト', 'クレジット', 'モデル', 'ロゴ', 'テンプレート', 'ひな形']);

/** 式の中の数字（順番は問わない）と、記号の並び（順番も見る。「100-20÷10」を「100÷20-10」に変えさせない） */
export function formulaParts(formula: string): { nums: string[]; ops: string[] } {
  const t = formula.normalize('NFKC').replace(/(\d),(?=\d{3}\b)/g, '$1');
  return { nums: (t.match(/\d+(?:\.\d+)?/g) ?? []).sort(), ops: t.match(/[+\-*/=×÷≒≈−]/g) ?? [] };
}

export interface LineProblem { key: string; problem: string }

/** 機械で決められる検査。natural / noise / clarity は呼び出し側が渡す関数で見る。 */
export function checkLine(target: FactTarget, text: string, haystack: string, extra: (text: string, target: FactTarget) => string[]): string[] {
  const problems: string[] = [];
  const t = text.trim();
  if (!t) return ['空'];
  if (t.length > target.max) problems.push(`${t.length}字（上限${target.max}）`);
  const fresh = newTokens(t, target.original, haystack);
  if (fresh.length > 0) problems.push(`元の文に無い数字・年・名前が入っている: ${fresh.join('、')}（円はコードが付けるので書かない。数字は元のままの形で書く）`);
  if (target.kind === 'formula') {
    const a = formulaParts(t); const b = formulaParts(target.original);
    if (a.nums.join(' ') !== b.nums.join(' ') || a.ops.join('') !== b.ops.join('')) problems.push('計算式の数字・記号が元と違う（式は変えず、言葉だけを直す。数字は元の書き方のまま。円は書かない）');
  }
  problems.push(...extra(t, target));
  return problems;
}

/** 事例ごとに差し替える。entityId の既存の行を消して、新しい行を足す（他の事例には触らない）。 */
export function replaceEntity(all: FactLineEntry[], entityId: string, mine: FactLineEntry[]): FactLineEntry[] {
  const order: Record<StoredKind, number> = { fact: 0, basis: 1, period: 2, formula: 3, analysis: 4, labels: 5 };
  return [...all.filter((x) => x.entityId !== entityId), ...mine].sort((a, b) => a.entityId.localeCompare(b.entityId) || order[a.kind] - order[b.kind] || a.targetId.localeCompare(b.targetId, 'en', { numeric: true }));
}

/** 料金の事実の行だけを差し替える。この事例の料金の対象にあった古い行は、新しい行が無ければ外す。 */
export const isPriceTarget = (t: FactTarget): boolean => (t.kind === 'fact' && t.where.includes('料金')) || (t.kind === 'analysis' && t.where.includes('PRICING'));

export function mergePrice(all: FactLineEntry[], entityId: string, reader: ReaderCase, mine: FactLineEntry[]): FactLineEntry[] {
  const price = collectTargets(reader).filter(isPriceTarget);
  const kept = all.filter((x) => !(x.entityId === entityId && price.some((t) => t.kind === x.kind && t.targetId === x.targetId)));
  return replaceEntity(kept, entityId, [...kept.filter((x) => x.entityId === entityId), ...mine]);
}

export const entryFor = (entityId: string, target: FactTarget, text: string): FactLineEntry => ({ entityId, kind: target.kind, targetId: target.targetId, hash: textFingerprint(target.original), text });

/** 札の検査。短い名詞（日本語か、SaaS・API のような既存の言い方）で、運営の印・重複・長すぎを落とす。 */
export function checkLabels(labels: string[], existing: string[], operator: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  for (const l of labels) {
    if (l.length > 14) problems.push(`札「${l}」が長い（14字以内）`);
    if (operator.has(l)) problems.push(`札「${l}」は運営の印`);
    if (existing.includes(l)) problems.push(`札「${l}」は既にある`);
    if (!/[ぁ-んァ-ヶ一-龠A-Za-z]/.test(l)) problems.push(`札「${l}」が文字でない`);
  }
  if (new Set(labels).size !== labels.length) problems.push('札が重複している');
  return problems;
}
