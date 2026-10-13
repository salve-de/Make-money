import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import {
  CASE_ARTICLE_TOPIC_IDS,
  CaseArticleSchema,
  CaseArticleSourceSchema,
  caseArticleLines,
  type CaseArticle,
  type CaseArticleSource,
} from '../../src/shared/case-article';
import { FOREIGN, POLITE, foreignWithoutYen } from '../case-pages/lib';

/**
 * 事例の記事の原稿（data/case-articles/<事例ID>/article.json）を読み、検査して、画面用の形にする。
 * 旧形式（scripts/case-pages/lib.ts）の検査を土台に、記事の構造（出典の番号・図・分類の並び・調査データとの結び）の検査を足す。
 */

export const CASE_ARTICLES_DIR = 'data/case-articles';
export const CASE_ARTICLES_FILE = 'data/case-articles.json';

export type ArticleRule =
  | 'schema' | 'entity-id' | 'polite' | 'yen-after-foreign'
  | 'cites' | 'sources' | 'figure' | 'topics' | 'research' | 'record-keys' | 'chapter-lead' | 'too-long' | 'long-paragraph';
export interface ArticleViolation { rule: ArticleRule; where: string; detail: string }

/** 画面用の記事の1件（data/case-articles.json の要素） */
export interface BuiltArticle { entityId: string; reviewState: CaseArticleSource['reviewState']; generation: number; article: CaseArticle }

// 旧形式の外貨に、スウェーデン・クローナ（SEK）と通貨コードを足したもの。旧形式の検査の結果は変えない
const FOREIGN_ARTICLE = new RegExp(
  `(?:[0-9０-９][0-9０-９,，.]*(?:[万千億百])?)\\s*(?:ドル|ユーロ|ポンド|ルピー|クローナ|SEK|EUR|USD|GBP)|(?:[$＄]|SEK|EUR|USD|GBP)\\s*[0-9０-９]`,
  FOREIGN.flags,
);

/**
 * 章は「結論の1文 → 短いデータ」で書く（長い文章は読まれない）。字数の上限は、結論の文・データの1行・補足のそれぞれ。
 * 上限に当たる時は、文を削るのでなく、行を分けるか表・箇条書きにする。
 */
/**
 * 上限は「長い段落を置かない」ための物。1行は、その行だけ読んで意味が全部分かる長さまで書いてよい
 * （短く切って「何の事？」「なぜ？」が残る行は、短くても不合格）。
 */
export const CHAPTER_LEAD_MAX = 100;
export const DATA_LINE_MAX = 110;
export const STEP_TEXT_MAX = 170;
export const LIST_ITEM_MAX = 140;
export const NOTE_MAX = 80;

/** 図（SVG）に入れてはいけないもの。外へ出る参照・埋め込み・スクリプト */
const SVG_FORBIDDEN: Array<{ re: RegExp; label: string }> = [
  { re: /<script/i, label: '<script' },
  { re: /href\s*=\s*["']?\s*https?:/i, label: 'href="http' },
  { re: /<foreignObject/i, label: '<foreignObject' },
  { re: /<image[\s>]/i, label: '<image' },
];

export const listArticleIds = (dir = CASE_ARTICLES_DIR): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(`${dir}/${d.name}/article.json`)).map((d) => d.name).sort()
    : [];

/** 原稿の中の recordKeys を全部集める（文・数字の帯・表の行・編集の記録） */
export function collectRecordKeys(source: CaseArticleSource): Array<{ where: string; key: string }> {
  const out: Array<{ where: string; key: string }> = [];
  // 原稿用の定義は recordKeys を持つ（型の上では生成元の都合で unknown になるので、ここで文字列の配列として読む）
  const keysOf = (x: unknown): string[] => (x as { recordKeys?: string[] }).recordKeys ?? [];
  const add = (where: string, keys: string[]) => keys.forEach((key) => out.push({ where, key }));
  source.kpis.forEach((k, i) => add(`数字の帯${i + 1}`, keysOf(k)));
  for (const topic of source.topics) {
    if (topic.lead) add(`${topic.id} / 結論の文`, keysOf(topic.lead));
    topic.blocks.forEach((b, i) => {
      const where = `${topic.id} / ブロック${i + 1}（${b.type}）`;
      switch (b.type) {
        case 'facts': case 'rates': case 'table': b.rows.forEach((r) => add(where, keysOf(r))); break;
        case 'paragraph': add(where, keysOf(b)); break;
        case 'steps': case 'timeline': case 'list': b.items.forEach((x) => add(where, keysOf(x))); break;
        case 'subheading': case 'figure': break;
      }
    });
  }
  source.editorialChanges.forEach((c, i) => add(`編集の記録${i + 1}`, keysOf(c)));
  return out;
}

/** 文の出典の番号（cites）を全部集める */
export function collectCites(article: CaseArticle): Array<{ where: string; no: number }> {
  const out: Array<{ where: string; no: number }> = [];
  const add = (where: string, nos: number[]) => nos.forEach((no) => out.push({ where, no }));
  for (const topic of article.topics) {
    if (topic.lead) add(`${topic.id} / 結論の文`, topic.lead.cites);
    topic.blocks.forEach((b, i) => {
      const where = `${topic.id} / ブロック${i + 1}（${b.type}）`;
      switch (b.type) {
        case 'facts': case 'rates': case 'table': b.rows.forEach((r) => add(where, r.cites)); break;
        case 'paragraph': add(where, b.cites); break;
        case 'steps': case 'timeline': case 'list': b.items.forEach((x) => add(where, x.cites)); break;
        case 'subheading': case 'figure': break;
      }
    });
  }
  return out;
}

/** 外貨の検査の対象にする文。数字の帯の value・rates の value・表のセルは、隣の yen の欄があれば円の概算つきとして外す */
export function foreignTargets(article: CaseArticle): Array<{ where: string; text: string }> {
  const copy = structuredClone(article);
  for (const k of copy.kpis) if (k.yen) k.value = '-';
  for (const topic of copy.topics) {
    for (const b of topic.blocks) {
      if (b.type === 'rates') for (const r of b.rows) if (r.yen) r.value = '-';
      if (b.type === 'table') for (const r of b.rows) for (const c of r.cells) if (c.yen) c.text = '-';
    }
  }
  return caseArticleLines(copy);
}

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

/** 原稿1件（ディレクトリ1つ）を読んで検査する。画面用の形は、検査に1件も違反が無い時だけ返す */
export function checkArticleDir(dir: string, entityId: string): { built: BuiltArticle | null; violations: ArticleViolation[] } {
  const v: ArticleViolation[] = [];
  const base = `${dir}/${entityId}`;
  let sourceParsed: CaseArticleSource;
  try {
    sourceParsed = CaseArticleSourceSchema.parse(JSON.parse(readFileSync(`${base}/article.json`, 'utf8')));
  } catch (e) {
    return { built: null, violations: [{ rule: 'schema', where: 'article.json', detail: `読めない: ${(e as Error).message.slice(0, 200)}` }] };
  }
  const source = sourceParsed;
  if (source.entityId !== entityId) v.push({ rule: 'entity-id', where: 'entityId', detail: `「${source.entityId}」がディレクトリ名「${entityId}」と違う` });

  // 図のファイルを data URI に直す（読めない・禁止の記述があるものは違反にして、画面用には入れない）
  const figures: Array<{ id: string; alt: string; width: number; height: number; src: string }> = [];
  const figureIds = new Set<string>();
  for (const f of source.figures) {
    if (figureIds.has(f.id)) v.push({ rule: 'figure', where: `図 ${f.id}`, detail: 'id が重複している' });
    figureIds.add(f.id);
    const path = `${base}/figures/${f.file}`;
    if (!existsSync(path)) { v.push({ rule: 'figure', where: `図 ${f.id}`, detail: `ファイルが無い: figures/${f.file}` }); continue; }
    const svg = readFileSync(path);
    const body = svg.toString('utf8');
    for (const { re, label } of SVG_FORBIDDEN) if (re.test(body)) v.push({ rule: 'figure', where: `図 ${f.id}`, detail: `SVG に ${label} がある` });
    figures.push({ id: f.id, alt: f.alt, width: f.width, height: f.height, src: `data:image/svg+xml;base64,${svg.toString('base64')}` });
  }
  for (const topic of source.topics) {
    topic.blocks.forEach((b, i) => {
      if (b.type === 'figure' && !figureIds.has(b.figureId)) v.push({ rule: 'figure', where: `${topic.id} / ブロック${i + 1}`, detail: `figureId「${b.figureId}」が figures に無い` });
    });
  }

  // 画面用の形（recordKeys などはここで落ちる）
  const parsed = CaseArticleSchema.safeParse({ ...source, figures });
  if (!parsed.success) return { built: null, violations: [...v, { rule: 'schema', where: '画面用の形', detail: parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join(' / ') }] };
  const article = parsed.data;

  // ① です・ます調（出典のラベルも見る）
  for (const { where, text } of caseArticleLines(article)) for (const m of text.matchAll(POLITE)) v.push({ rule: 'polite', where, detail: `「${m[0]}」は常体に直す` });
  for (const s of article.sources) for (const m of s.label.matchAll(POLITE)) v.push({ rule: 'polite', where: `出典${s.no}`, detail: `「${m[0]}」は常体に直す` });
  // ② 一覧の1行は字数で止めない（2026-10-08 オーナー決定: 字数は自由。その1行だけで何の商売かが分かることが先）
  // ③ 外貨の直後の円の概算
  for (const { where, text } of foreignTargets(article)) for (const miss of foreignWithoutYen(text, FOREIGN_ARTICLE)) v.push({ rule: 'yen-after-foreign', where, detail: `「${miss}」の直後に円の概算（約…円）が要る` });
  // ④ 出典の番号
  article.sources.forEach((s, i) => { if (s.no !== i + 1) v.push({ rule: 'sources', where: `出典${i + 1}`, detail: `no が ${s.no}（1から連番にする）` }); });
  const nos = new Set(article.sources.map((s) => s.no));
  for (const c of collectCites(article)) if (!nos.has(c.no)) v.push({ rule: 'cites', where: c.where, detail: `出典${c.no}が sources に無い` });
  // ⑥ 分類の id の重複・並び
  const ids = article.topics.map((t) => t.id);
  if (new Set(ids).size !== ids.length) v.push({ rule: 'topics', where: 'topics', detail: `id が重複している: ${ids.join(', ')}` });
  const order = ids.map((id) => CASE_ARTICLE_TOPIC_IDS.indexOf(id));
  if (order.some((n, i) => i > 0 && n < order[i - 1])) v.push({ rule: 'topics', where: 'topics', detail: `並びが決まった順（${CASE_ARTICLE_TOPIC_IDS.join(' → ')}）でない: ${ids.join(' → ')}` });
  // ⑦ 章の形: 結論の1文が先、その下は短いデータ。長い段落は置かない
  const chars = (t: string) => [...t].length;
  const tooLong = (where: string, text: string, max: number) => { if (chars(text) > max) v.push({ rule: 'too-long', where, detail: `${chars(text)}字（${max}字以内。行を分けるか表・箇条書きにする）: ${text.slice(0, 30)}…` }); };
  for (const topic of article.topics) {
    if (!topic.lead) v.push({ rule: 'chapter-lead', where: topic.id, detail: '章の最初に結論の1文（lead）が要る' });
    else tooLong(`${topic.id} / 結論の文`, topic.lead.text, CHAPTER_LEAD_MAX);
    topic.blocks.forEach((b, i) => {
      const where = `${topic.id} / ブロック${i + 1}（${b.type}）`;
      switch (b.type) {
        case 'facts': b.rows.forEach((r) => tooLong(where, r.text, DATA_LINE_MAX)); break;
        case 'paragraph':
          if (b.tone === 'body') v.push({ rule: 'long-paragraph', where, detail: '段落（body）は置かない。項目の行・箇条書き・表にするか、短い補足（note）にする' });
          tooLong(where, b.text, NOTE_MAX);
          break;
        case 'steps': b.items.forEach((x) => tooLong(where, x.text, STEP_TEXT_MAX)); break;
        case 'list': b.items.forEach((x) => tooLong(where, x.text, LIST_ITEM_MAX)); break;
        case 'timeline': b.items.forEach((x) => tooLong(where, x.text, DATA_LINE_MAX)); break;
        case 'rates': b.rows.forEach((r) => { if (r.note) tooLong(where, r.note, DATA_LINE_MAX); }); break;
        case 'table': case 'subheading': case 'figure': break;
      }
    });
  }
  // ⑧ 調査データの指紋
  const researchPath = `${base}/research.json`;
  if (!existsSync(researchPath)) {
    v.push({ rule: 'research', where: 'research.json', detail: '同じ場所に research.json が無い' });
  } else {
    const bytes = readFileSync(researchPath);
    if (sha256(bytes) !== source.basedOn.submissionSha256) v.push({ rule: 'research', where: 'basedOn.submissionSha256', detail: 'research.json の sha256 と一致しない' });
    // ⑨ recordKeys が調査の記録にある
    try {
      const research = JSON.parse(bytes.toString('utf8')) as { records?: Array<{ key?: string }> };
      const keys = new Set((research.records ?? []).map((r) => r.key));
      for (const { where, key } of collectRecordKeys(source)) if (!keys.has(key)) v.push({ rule: 'record-keys', where, detail: `recordKey「${key}」が research.json の records に無い` });
    } catch (e) {
      v.push({ rule: 'research', where: 'research.json', detail: `読めない: ${(e as Error).message.slice(0, 120)}` });
    }
  }
  return { built: v.length === 0 ? { entityId: source.entityId, reviewState: source.reviewState, generation: source.generation, article } : null, violations: v };
}

export function buildAll(dir = CASE_ARTICLES_DIR) {
  const articles: BuiltArticle[] = [];
  const violations: Array<{ entityId: string } & ArticleViolation> = [];
  for (const entityId of listArticleIds(dir)) {
    const r = checkArticleDir(dir, entityId);
    if (r.built) articles.push(r.built);
    for (const x of r.violations) violations.push({ entityId, ...x });
  }
  return { articles, violations };
}
