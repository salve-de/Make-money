import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CasePageSchema } from './case-page';
import { checkCasePage, checkMarkdown, foreignWithoutYen, heldSources, missingChapters, parseCasePage, parseRights } from '../../scripts/case-pages/lib';
import { displayForEntity, type DisplaySourceFiles } from './reader-display';
import { buildCasePageReader } from '../../scripts/case-pages/reader';
import { ReaderCaseSchema } from './reader-case';

const MD = `# 題（試し書き）2026-10-08

## 一覧の1行
駄菓子の定期便で累計1.5億円

## 概要
会社は2011年に始めた。累計の売上は100万ドル（約1.5億円）を超えた。

## 成功の秘訣
1. **珍しさを見抜いた**
   日本ではありふれた菓子も、海外では珍しい。
2. **契約にした**
   売れ残りを避けられる。

## 実際にやったこと
- 掲示板に投稿した。

## つまずきと立て直し
- 会員が4割減った。

## 料金
- 月12.95ドル（約1,900円）から。

## 時間順の流れ
- 2011年7月：始める。
- 流行後：受付を止める。

## 数字と出典
1. 公式サイト（料金）：https://example.com/
2. 本人の振り返り（売上）：https://example.com/review

- 1ドル＝150円で計算

## 権利の記録
1. example.com：ログインなしで読めた／2026-10-08
- 読めなかった（本文に使っていない）：foo
`;

describe('章ごとの文を読む', () => {
  const page = parseCasePage(MD);
  it('題の行は取り除き、全章を構造にする', () => {
    expect(page.listLine).toBe('駄菓子の定期便で累計1.5億円');
    expect(page.secrets).toEqual([
      { head: '珍しさを見抜いた', body: '日本ではありふれた菓子も、海外では珍しい。' },
      { head: '契約にした', body: '売れ残りを避けられる。' },
    ]);
    expect(page.timeline[1]).toEqual({ when: '流行後', what: '受付を止める。' });
    expect(page.sources[1]).toEqual({ no: 2, label: '本人の振り返り（売上）', url: 'https://example.com/review' });
    expect(page.notes).toEqual(['1ドル＝150円で計算']);
    expect(JSON.stringify(page)).not.toContain('試し書き');
    expect(CasePageSchema.safeParse(page).success).toBe(true);
  });
  it('権利の記録は画面の構造に入れず、別に取り出す', () => {
    expect(JSON.stringify(page)).not.toContain('ログインなし');
    expect(parseRights(MD)).toEqual([
      { no: 1, host: 'example.com', text: 'ログインなしで読めた／2026-10-08' },
      { no: 0, host: '補足', text: '読めなかった（本文に使っていない）：foo' },
    ]);
  });
  it('正しい文は検査に通る', () => {
    expect(checkCasePage(page)).toEqual([]);
    expect(checkMarkdown(MD).violations).toEqual([]);
  });
});

describe('軽い検査（4つ）', () => {
  const page = parseCasePage(MD);
  it('です・ますを見つける', () => {
    for (const bad of ['始めました。', 'です。', 'あります。', 'でした。']) {
      expect(checkCasePage({ ...page, did: [bad] }).map((v) => v.rule)).toContain('polite');
    }
  });
  it('一覧の1行は字数の上限が無い', () => {
    expect(checkCasePage({ ...page, listLine: '駄菓子'.repeat(40) + '定期便' })).toEqual([]);
  });
  it('一覧の1行は文の形を機械で決めない（推定・推測の語だけ見る）', () => {
    expect(checkCasePage({ ...page, listLine: '駄菓子を海外へ送る。累計1.5億円の定期便' })).toEqual([]);
    expect(checkCasePage({ ...page, listLine: '30分で作った道具が使われ、買収された' })).toEqual([]);
    expect(checkCasePage({ ...page, listLine: '副業の30分で作った拡張機能で年約7,200万円' })).toEqual([]);
    expect(checkCasePage({ ...page, listLine: '海外で駄菓子を売り累計1.5億円を得た創業者' })).toEqual([]);
  });
  it('一覧の1行に推定・推測の語を出さない', () => {
    expect(checkCasePage({ ...page, listLine: '1人で回して年30億円（推定）' }).map((v) => v.rule)).toEqual(['list-line-estimate']);
    expect(checkCasePage({ ...page, listLine: '1人で回して年30億円（推測）' }).map((v) => v.rule)).toEqual(['list-line-estimate']);
  });
  it('外貨の数字の直後に円の概算があるか', () => {
    expect(foreignWithoutYen('売上は25万ドルだった')).toEqual(['25万ドル']);
    expect(foreignWithoutYen('売上は25万ドル（約3,750万円）だった')).toEqual([]);
    expect(foreignWithoutYen('1,500ドル弱（約22万円弱）')).toEqual([]);
    expect(foreignWithoutYen('Starter 199ドル（約3万円、通常299ドル）')).toEqual([]);
    expect(foreignWithoutYen('1.5億〜4.5億円（100万〜300万ドル）')).toEqual([]);
    expect(foreignWithoutYen('3万6千ドル（約540万円）と50ドル')).toEqual(['50ドル']);
    expect(foreignWithoutYen('日本円で3,000円')).toEqual([]);
  });
  it('調べた側のメモ（未確認・権利の記録など）が画面の章に入った文は止める', () => {
    expect(checkMarkdown(MD.replace('駄菓子の定期便で累計1.5億円', '駄菓子の定期便で累計1.5億円')).violations).toEqual([]);
    for (const w of ['未確認：売上は照合中。', '1ドル＝150円の目安。', '1ドル＝150円で計算した。', 'ログインなしで読めた。', '売上は約3万ドルと推定される（推定）。', '狙いだったとみられる（推測）。']) {
      expect(checkMarkdown(MD.replace('- 掲示板に投稿した。', `- 掲示板に投稿した。${w}`)).violations.some((v) => v.rule === 'maker-memo'), w).toBe(true);
    }
  });
  it('利用が保留・不可の出典を挙げた文は止める', () => {
    expect(heldSources(page, { 'https://example.com/review/': { decision: 'held' }, 'https://example.com/': { decision: 'allowed' } }).map((v) => v.where)).toEqual(['出典2']);
    expect(heldSources(page, {})).toEqual([]);
  });
  it('章が足りない・空・出典のリンクが無い文書は止める', () => {
    expect(missingChapters(MD)).toEqual([]);
    expect(missingChapters(MD.replace('## 料金\n- 月12.95ドル（約1,900円）から。\n', '')).map((v) => v.where)).toContain('料金');
    expect(missingChapters(MD.replace('## 実際にやったこと\n- 掲示板に投稿した。\n', '## 実際にやったこと\n')).map((v) => v.detail)).toContain('章が空');
    expect(missingChapters(MD.replace('：https://example.com/review', '')).map((v) => v.detail)).toContain('出典2にリンクが無い');
  });
});

describe('番号つき見出しと任意の章', () => {
  const md = readFileSync('data/case-pages/ent_button_shy_f1545f17d98e.md', 'utf8');
  it('見出しの番号を外して読み、無い章は空にする', () => {
    const page = parseCasePage(md);
    expect(page.listLine).toBe('家族と友人で営む小さな出版社が作った、クラウドファンディングで1作に約2,000万円が集まったこともある、財布に入るほど小さなカードゲーム');
    expect(page.setbacks).toEqual([]);
    expect(page.secrets).toHaveLength(5);
    expect(page.sources.length).toBeGreaterThan(5);
    expect(page.sources[0].no).toBe(1);
  });
  it('「つまずきと立て直し」は無くてよいが、ほかの章が欠けると落ちる', () => {
    expect(checkMarkdown(md).violations.filter((v) => !v.rule.startsWith('list-line'))).toEqual([]);
    expect(checkMarkdown(md.replace('## 5. 料金', '## 5. 値段')).violations.some((v) => v.rule === 'missing-chapter')).toBe(true);
  });
  it('題の下の作業メモは画面の文に入らない', () => {
    expect(JSON.stringify(parseCasePage(md))).not.toContain('直した点');
  });
});

describe('公開版への組み込み', () => {
  const page = parseCasePage(MD);
  it('正本の json から事例の display.casePage に入る', () => {
    const files = { 'list-lines': [], 'summary-lines': [], 'detail-lines': [], 'success-points': [], 'case-chapters': [], 'case-pages': [{ entityId: 'e1', page }] } as DisplaySourceFiles;
    expect(displayForEntity(files, 'e1')?.casePage?.listLine).toBe(page.listLine);
    expect(displayForEntity(files, 'e2')).toBeUndefined();
  });
  it('章ごとの文の事例の reader は、概要の事実1件で形の検査を通る', () => {
    const reader = buildCasePageReader(page);
    expect(ReaderCaseSchema.safeParse(reader).success).toBe(true);
    expect(reader.facts).toHaveLength(1);
    expect(reader.analysis).toEqual([]);
    expect(reader.display?.casePage).toBe(page);
  });
  it('置いてある正本はすべて検査に通り、書き出し済みの json と一致する', () => {
    const built = JSON.parse(readFileSync('data/case-pages.json', 'utf8')) as Array<{ entityId: string; page: unknown }>;
    expect(built.length).toBeGreaterThan(0);
    for (const { entityId, page: p } of built) {
      const md = readFileSync(`data/case-pages/${entityId}.md`, 'utf8');
      expect(checkMarkdown(md).violations, entityId).toEqual([]);
      expect(parseCasePage(md), entityId).toEqual(p);
    }
  });
});
