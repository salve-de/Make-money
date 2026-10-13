import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CaseArticleSchema, caseArticleTexts } from './case-article';
import { displayForEntity, type DisplaySourceFiles } from './reader-display';
import { ReaderCaseSchema } from './reader-case';
import { buildAll, checkArticleDir, CHAPTER_LEAD_MAX, DATA_LINE_MAX } from '../../scripts/case-articles/lib';
import { buildCaseArticleReader } from '../../scripts/case-articles/reader';
import { validateReader } from '../lib/company-access/reader-case-projection';
import { foreignWithoutYen } from '../../scripts/case-pages/lib';

const ID = 'ent_sample_000000000001';
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
const RESEARCH = JSON.stringify({ schema_version: 'make-money.collection-submission.v1', records: [{ key: 'r1' }, { key: 'r2' }] });

/** 全ブロック種別を1つずつ入れた小さな原稿 */
function sample(): Record<string, unknown> {
  const line = (text: string) => ({ text, cites: [1], recordKeys: ['r1'] });
  return {
    schema: 'make-money.case-article.v2', entityId: ID, name: 'サンプル', revision: 'r1', reviewState: 'ready_for_review', generation: 5,
    basedOn: { packageId: 'p1', submissionSha256: createHash('sha256').update(RESEARCH).digest('hex') },
    listLine: '無料のフォームで広がった1人運営の会社', headline: '無料で配り、有料の機能で稼ぐ', lead: '創業者は1人で、料金表は3段。',
    sources: [{ no: 1, label: '公式のブログ', url: 'https://example.com/a' }, { no: 2, label: '料金ページ', url: 'https://example.com/b' }],
    sourceKeys: { S1: 'one' },
    kpis: [{ label: '年間売上', value: '600万ドル', yen: '約9億円', period: '2026年', recordKeys: ['r1'] }],
    topics: [
      { id: 'overview', lead: line('フォームを作って配る会社。'), blocks: [{ type: 'paragraph', tone: 'note', ...line('無料で始められる。') }, { type: 'figure', figureId: 'loop' }] },
      { id: 'mechanism', lead: line('無料が入口になる。'), blocks: [
        { type: 'facts', variant: 'text', rows: [{ label: '入口', ...line('無料で使える。') }] },
        { type: 'steps', items: [{ title: '作る', ...line('フォームを作る。') }] },
        { type: 'subheading', text: '内訳' },
      ] },
      { id: 'revenue', lead: line('有料の機能で稼ぐ。'), blocks: [
        { type: 'rates', caption: '料金', rows: [{ label: '有料', value: '29ドル', yen: '約4,400円', note: '月額', cites: [2], recordKeys: ['r2'] }] },
        { type: 'table', columns: ['項目', '値'], rows: [{ label: '売上', cells: [{ text: '600万ドル', yen: '約9億円' }], cites: [1], recordKeys: ['r1'] }] },
        { type: 'paragraph', tone: 'note', ...line('円は概算。') },
      ] },
      { id: 'history', lead: line('2020年に公開した。'), blocks: [
        { type: 'timeline', items: [{ when: '2020年', title: '開始', ...line('公開した。') }] },
        { type: 'list', ordered: false, items: [{ lead: '2021年', ...line('有料を始めた。') }] },
      ] },
      { id: 'reasons', lead: line('配った物がそのまま宣伝になった。'), blocks: [
        { type: 'facts', variant: 'text', rows: [{ label: '効いたこと', ...line('無料の利用者が外へ配る。') }] },
      ] },
    ],
    figures: [{ id: 'loop', file: 'loop.svg', alt: '無料から有料へ進む流れ', width: 10, height: 10 }],
    editorialChanges: [{ kind: 'other', where: '概要', text: '言い換え', reason: '見本から', recordKeys: ['r2'] }],
  };
}

const dirs: string[] = [];
function setup(edit?: (a: Record<string, unknown>) => void, opts: { research?: string | null; svg?: string; skipSvg?: boolean } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'case-article-'));
  dirs.push(root);
  const base = join(root, ID);
  mkdirSync(join(base, 'figures'), { recursive: true });
  const a = sample();
  edit?.(a);
  writeFileSync(join(base, 'article.json'), JSON.stringify(a));
  if (opts.research !== null) writeFileSync(join(base, 'research.json'), opts.research ?? RESEARCH);
  if (!opts.skipSvg) writeFileSync(join(base, 'figures', 'loop.svg'), opts.svg ?? SVG);
  return root;
}
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
const rules = (root: string) => checkArticleDir(root, ID).violations.map((v) => v.rule);
const mutate = (fn: (a: any) => void) => setup((a) => fn(a)); // eslint-disable-line @typescript-eslint/no-explicit-any

describe('case-article 原稿の検査', () => {
  it('小さな原稿（全ブロック種別）は違反なく画面用になり、recordKeys・sourceKeys・編集の記録が落ちる', () => {
    const { built, violations } = checkArticleDir(setup(), ID);
    expect(violations).toEqual([]);
    expect(built?.reviewState).toBe('ready_for_review');
    const text = JSON.stringify(built?.article);
    expect(text).not.toContain('recordKeys');
    expect(text).not.toContain('sourceKeys');
    expect(text).not.toContain('editorialChanges');
    expect(built?.article.figures[0].src).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(CaseArticleSchema.safeParse(built?.article).success).toBe(true);
    expect(caseArticleTexts(built!.article)).toContain('無料から有料へ進む流れ');
  });
  it('章の最初の文は無くてもよい。長い段落を置いた・1行が長すぎる、は止める', () => {
    expect(rules(mutate((a) => { delete a.topics[0].lead; }))).toEqual([]);
    expect(rules(mutate((a) => { a.topics[0].blocks[0].tone = 'body'; }))).toContain('long-paragraph');
    expect(rules(mutate((a) => { a.topics[1].blocks[0].rows[0].text = 'あ'.repeat(DATA_LINE_MAX + 1); }))).toContain('too-long');
    expect(rules(mutate((a) => { a.topics[1].lead.text = 'あ'.repeat(CHAPTER_LEAD_MAX + 1); }))).toContain('too-long');
  });
  it('1 です・ます調を落とす', () => { expect(rules(mutate((a) => { a.lead = 'この会社は強いです。'; }))).toContain('polite'); });
  it('2 一覧の1行は字数で止めない（その1行だけで何の商売かが分かる長さまで書く）', () => { expect(rules(mutate((a) => { a.listLine = 'あ'.repeat(60); }))).toEqual([]); });
  it('3 外貨の直後に円の概算が無いと落とす（SEK・クローナも）', () => {
    expect(rules(mutate((a) => { a.lead = '年間の売上は100万ドルだった。'; }))).toContain('yen-after-foreign');
    expect(rules(mutate((a) => { a.lead = '料金は月120 SEKだった。'; }))).toContain('yen-after-foreign');
    expect(rules(mutate((a) => { a.lead = '料金は月120クローナだった。'; }))).toContain('yen-after-foreign');
    expect(rules(mutate((a) => { a.lead = '料金は月120クローナ（約1,700円）だった。'; }))).not.toContain('yen-after-foreign');
  });
  it('3 数字の帯・rates・表は、隣の yen があれば可、無ければ落とす', () => {
    expect(rules(mutate((a) => { delete a.kpis[0].yen; }))).toContain('yen-after-foreign');
    expect(rules(mutate((a) => { delete a.topics[2].blocks[0].rows[0].yen; }))).toContain('yen-after-foreign');
    expect(rules(mutate((a) => { delete a.topics[2].blocks[1].rows[0].cells[0].yen; }))).toContain('yen-after-foreign');
    expect(rules(setup())).toEqual([]);
  });
  it('3 旧形式の外貨の検査の結果は変わらない（SEK は旧形式では見ない）', () => {
    expect(foreignWithoutYen('120 SEKだった')).toEqual([]);
    expect(foreignWithoutYen('100万ドルだった')).toEqual(['100万ドル']);
  });
  it('4 cites が sources に無い／sources の no が連番でないと落とす', () => {
    expect(rules(mutate((a) => { a.topics[0].blocks[0].cites = [9]; }))).toContain('cites');
    expect(rules(mutate((a) => { a.sources[1].no = 3; }))).toContain('sources');
  });
  it('5 figureId・図のファイル・SVG の禁止事項を落とす', () => {
    expect(rules(mutate((a) => { a.topics[0].blocks[1].figureId = 'none'; }))).toContain('figure');
    expect(rules(setup(undefined, { skipSvg: true }))).toContain('figure');
    for (const bad of ['<script>1</script>', '<a href="http://x"/>', '<foreignObject/>', '<image href="data:x"/>']) {
      expect(rules(setup(undefined, { svg: `<svg xmlns="http://www.w3.org/2000/svg">${bad}</svg>` }))).toContain('figure');
    }
  });
  it('6 分類の id の重複・並び違いを落とす', () => {
    expect(rules(mutate((a) => { a.topics[1].id = 'overview'; }))).toContain('topics');
    expect(rules(mutate((a) => { a.topics.reverse(); }))).toContain('topics');
  });
  it('7 research.json が無い・指紋が違うと落とす', () => {
    expect(rules(setup(undefined, { research: null }))).toContain('research');
    expect(rules(setup(undefined, { research: `${RESEARCH} ` }))).toContain('research');
  });
  it('8 recordKeys が research.json の records に無いと落とす', () => {
    expect(rules(mutate((a) => { a.topics[0].blocks[0].recordKeys = ['zzz']; }))).toContain('record-keys');
    expect(rules(mutate((a) => { a.editorialChanges[0].recordKeys = ['zzz']; }))).toContain('record-keys');
  });
  it('違反がある原稿は画面用に出さない／ディレクトリ名と entityId が違うと落とす', () => {
    const root = setup((a) => { a.lead = 'だめです。'; });
    expect(buildAll(root).articles).toEqual([]);
    expect(rules(mutate((a) => { a.entityId = 'ent_other'; }))).toContain('entity-id');
  });
  it('原稿が無い置き場は 0件', () => { expect(buildAll(join(tmpdir(), 'case-article-none-xyz'))).toEqual({ articles: [], violations: [] }); });
});

describe('case-article の公開の関門', () => {
  const article = checkArticleDir(setup(), ID).built!.article;
  const empty = { 'list-lines': [], 'summary-lines': [], 'detail-lines': [], 'success-points': [], 'case-chapters': [] } as unknown as DisplaySourceFiles;
  const files = (state: 'draft' | 'ready_for_review' | 'approved'): DisplaySourceFiles => ({ ...empty, 'case-articles': [{ entityId: ID, reviewState: state, generation: 5, article }] });
  it('approved だけが displayForEntity に入る', () => {
    expect(displayForEntity(files('approved'), ID)?.caseArticle).toBeDefined();
    expect(displayForEntity(files('ready_for_review'), ID)).toBeUndefined();
    expect(displayForEntity(files('draft'), ID)).toBeUndefined();
  });
  it('記事が無い（approved が0件）なら何も付かない', () => { expect(displayForEntity({ ...empty, 'case-articles': [] }, ID)).toBeUndefined(); });
  it('reader は検査を通り、事実は概要の1件だけで数値・推論は持たない', () => {
    const reader = buildCaseArticleReader(article, 'サンプル');
    expect(validateReader(reader)).toBeNull();
    expect(ReaderCaseSchema.safeParse(reader).success).toBe(true);
    expect(reader.facts).toHaveLength(1);
    expect(reader.facts[0].text).toBe(article.listLine);
    expect(reader.metrics).toEqual([]);
    expect(reader.analysis).toEqual([]);
    expect(reader.display?.caseArticle).toBe(article);
  });
});
