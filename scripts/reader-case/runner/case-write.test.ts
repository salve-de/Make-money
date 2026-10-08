import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hideLines } from '../owner-context';
import { jaAmount, verifyDraft, yenOff } from '../../case-write/verify';
import { extractMarkdown, writeCase } from '../../case-write/run';
import type { CaseInput } from '../../case-write/input';
import type { Caller } from '../agent-call';

const ROOT = new URL('../../..', import.meta.url).pathname;

const input: CaseInput = {
  id: 'ent_x', name: 'Xbox Shop', facts: [{ text: '2019年に公開した。' }], unknowns: [],
  sources: [
    { no: 1, url: 'https://x.example/about', text: 'We launched in 2019. Revenue was $120K in 2021 with 3,000 customers. '.repeat(5) },
    { no: 2, url: 'https://x.example/dead', text: '', error: 'http-404' },
  ],
};

const page = (body: { list?: string; did?: string; src?: string } = {}) => `# Xbox Shop

## 一覧の1行
${body.list ?? '2019年に公開し、年12万ドル（約1,800万円）を売る小さな店'}

## 概要
Xbox Shop は2019年に公開した店。2021年の売上は12万ドル（約1,800万円）。

## 成功の秘訣
1. **小さく始めた**
   客は3,000人。

## 実際にやったこと
- ${body.did ?? '2019年に公開した。'}

## 料金
- 月10ドル（約1,500円）。（推測）

## 時間順の流れ
- 2019年：公開。

## 数字と出典
1. 公式の紹介（公開年、2021年の売上、客の数）：${body.src ?? 'https://x.example/about'}

- 1ドル＝150円で計算
`;

test('hideLines: 名前を含む行と、「名前:」の後の引用を外す', () => {
  const t = ['見本', '1. 良い1行（Xbox Shop）', 'Xbox Shop:', '> 答えの概要', '>', '> 2段落目', '', '残る'].join('\n');
  assert.equal(hideLines(t, ['xbox shop']), ['見本', '', '残る'].join('\n'));
  assert.equal(hideLines(t, []), t);
});

test('jaAmount と yenOff: 円の概算のずれだけを拾う', () => {
  assert.equal(jaAmount('3万4千'), 34000);
  assert.equal(jaAmount('2,400万'), 24_000_000);
  assert.equal(jaAmount('1億2,500万'), 125_000_000);
  assert.deepEqual(yenOff('16万ドル（約2,400万円）'), []);
  assert.deepEqual(yenOff('3万4千ドル（約510万円）'), []);
  assert.equal(yenOff('3万4千ドル（約51万円）').length, 1);
});

test('verifyDraft: 出典どおりの文は通る（印の付いた推測の数字も通る）', () => {
  assert.deepEqual(verifyDraft(page(), input), []);
});

test('verifyDraft: 出典に無い数字・年、渡していない出典、本文の取れない出典を拾う', () => {
  const v = verifyDraft(page({ did: '2015年に客が5,000人になった。', src: 'https://x.example/dead' }), input);
  const rules = v.map((x) => x.rule).sort();
  assert.ok(rules.includes('number-not-in-sources'));
  assert.ok(rules.includes('year-not-in-sources'));
  assert.ok(rules.includes('unknown-source'));
});

test('verifyDraft: 一覧の1行の推定語は今の正本の検査と同じく拾う', () => {
  assert.ok(verifyDraft(page({ list: '年12万ドル（約1,800万円）と推定される店' }), input).some((x) => x.rule === 'list-line-estimate'));
});

test('extractMarkdown: 前置きと囲みを外し、最初の「# 」から返す', () => {
  assert.equal(extractMarkdown('はい。\n```markdown\n# A\n本文\n```\n'), '# A\n本文\n');
  assert.equal(extractMarkdown('前置き\n# B\nx'), '# B\nx\n');
});

test('writeCase: 書く→読む→照らす。合わなければ書く担当へ返し、直れば合格', async () => {
  const seen: string[] = [];
  const replies = [page({ did: '2015年に公開した。' }), page({ did: '2015年に公開した。' }), page()];
  const caller: Caller = async (req) => { seen.push(req.label); return { text: replies.shift()!, seconds: 0, costUsd: 0.1 }; };
  const r = await writeCase(input, caller, { root: ROOT, maxRepairs: 2 });
  assert.equal(r.ok, true);
  assert.deepEqual(seen, ['ent_x 書く', 'ent_x 読む', 'ent_x 直す1']);
  assert.equal(r.calls, 3);
});

test('writeCase: 直す上限を超えたら不合格のまま返す（書き出さないのは呼び側）', async () => {
  const caller: Caller = async () => ({ text: page({ did: '2015年に公開した。' }), seconds: 0 });
  const r = await writeCase(input, caller, { root: ROOT, maxRepairs: 1 });
  assert.equal(r.ok, false);
  assert.equal(r.calls, 3);
  assert.ok(r.violations.length > 0);
});

test('sourceText: 試しで取ってきた本文は data/source-cache でなく指定の場所に残す', async () => {
  const { mkdtempSync, existsSync, readdirSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { sourceText } = await import('../../case-write/input');
  const root = mkdtempSync(join(tmpdir(), 'case-write-'));
  const r = await sourceText(root, 'https://x.example/a', [], async (url) => ({ url, status: 200, fetchedAt: 't', via: 'direct', text: 'x'.repeat(300) }), 'data/source-cache.trial');
  assert.equal(r?.text.length, 300);
  assert.equal(existsSync(join(root, 'data/source-cache')), false);
  assert.equal(readdirSync(join(root, 'data/source-cache.trial')).length, 1);
  // 2回目は写しから読む（取りに行かない）
  const again = await sourceText(root, 'https://x.example/a', [], async () => { throw new Error('取りに行った'); }, 'data/source-cache.trial');
  assert.equal(again?.text.length, 300);
});

test('splitNotes: 「調べた側のメモ」の章を本文から切り離す（画面に出さない）', async () => {
  const { splitNotes } = await import('../../case-write/run');
  const md = '# A\n\n## 数字と出典\n1. x：https://a\n\n## 調べた側のメモ\n- 未確認：売上の期間\n';
  const r = splitNotes(md);
  assert.equal(r.notes, '- 未確認：売上の期間');
  assert.ok(!r.page.includes('未確認'));
  assert.ok(r.page.includes('## 数字と出典'));
  assert.equal(splitNotes('# A\n\n## 調べた側のメモ\nなし\n').notes, '');
  assert.equal(splitNotes('# B\n').notes, '');
});
