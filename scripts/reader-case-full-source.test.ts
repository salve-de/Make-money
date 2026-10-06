import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { ReaderCase } from '../src/shared/reader-case';
import { analyzeSources } from './reader-case/build-analyze-batches';
import { digestEvidence, diffEvidence, reevaluationTargets } from './reader-case/evidence-digest';
import { planFill } from './reader-case/build-fill-batches';
import { loadRawItems } from './reader-case/load-readers';
import { CHUNK_OVERLAP, chunkSources, packByChunks, splitIntoChunks } from './reader-case/source-chunks';

const MARK = '【重要】2023年3月に初の有料顧客120社を獲得した。';
/** 50,000字の本文。MARK は30,000字目付近に置く（検証H） */
function longText(): string {
  const filler = '本文の埋め草です。ここに重要情報はありません。\n';
  let t = '';
  while (t.length < 30_000) t += filler;
  t += MARK;
  while (t.length < 50_000) t += filler;
  return t.slice(0, 50_000);
}

test('検証H: 本文50,000字の30,000字目の重要情報が、分析の入力（チャンク）に入る', () => {
  const text = longText();
  assert.equal(text.length, 50_000);
  assert.ok(text.indexOf('【重要】') >= 29_000);
  const { entries, fullTexts } = analyzeSources(
    [{ id: 's1', publisher: 'X', url: 'https://example.com/a' }] as ReaderCase['sources'],
    () => text,
  );
  assert.ok(entries.length >= 6, `8,000字目安で6チャンク以上: ${entries.length}`);
  assert.ok(entries.some((e) => e.text.includes(MARK)), '30,000字目の重要情報がどれかのチャンクに入る');
  assert.equal(fullTexts.s1, text);
  assert.ok(entries.every((e) => e.sourceId === 's1' && e.parts === entries.length));
});

test('チャンクは本文を漏れなく・重ならずに覆い、切れ目の文は重なりで残る', () => {
  const text = longText();
  const chunks = splitIntoChunks(text);
  assert.equal(chunks.map((c) => text.slice(c.start, c.end)).join(''), text);
  assert.equal(chunks[0]!.start, 0);
  for (let i = 1; i < chunks.length; i++) {
    assert.equal(chunks[i]!.start, chunks[i - 1]!.end);
    assert.ok(chunks[i]!.text.startsWith(text.slice(Math.max(0, chunks[i]!.start - CHUNK_OVERLAP), chunks[i]!.start)));
  }
  // 区切りの無い本文（日本語の長文・単語境界なし）でも漏れない
  const solid = 'あ'.repeat(25_000);
  assert.equal(splitIntoChunks(solid).map((c) => solid.slice(c.start, c.end)).join(''), solid);
  assert.deepEqual(splitIntoChunks(''), []);
});

test('束の大きさはチャンク数で制御する（事例数の上限も守り、巨大な1事例は単独の束）', () => {
  const cases = [{ n: 8 }, { n: 8 }, { n: 8 }, { n: 30 }, { n: 1 }, { n: 1 }];
  const batches = packByChunks(cases, (c) => c.n, 20, 20);
  assert.deepEqual(batches.map((b) => b.map((c) => c.n)), [[8, 8], [8], [30], [1, 1]]);
  const many = Array.from({ length: 5 }, () => ({ n: 0 }));
  assert.deepEqual(packByChunks(many, (c) => c.n, 2, 20).map((b) => b.length), [2, 2, 1]);
  assert.deepEqual(chunkSources([{ sourceId: 'a', url: 'u', publisher: 'p', text: 'x'.repeat(100) }]).map((e) => [e.part, e.parts]), [[1, 1]]);
});

const readerOf = (over: Partial<ReaderCase>): ReaderCase => ({ sources: [], facts: [], metrics: [], unknowns: [], analysis: [], ...over }) as unknown as ReaderCase;
const digestOf = (factText: string, srcText: string) => digestEvidence([{ id: 'f1', kind: 'DESCRIPTION', text: factText }], [], { s1: srcText });

test('新しい根拠が入ると、既存の文と「未確認」判定が再評価の対象になる', () => {
  const reader = readerOf({
    unknowns: ['REVENUE', 'TEAM'],
    analysis: [
      { id: 'a-1', item: 'STORY', text: '既存の物語。', basis: ['f1'], confidence: 'MEDIUM' },
      { id: 'a-2', item: 'REVENUE_ESTIMATE', text: '売上は不明。', basis: [], confidence: 'LOW' },
    ] as ReaderCase['analysis'],
  });
  const before = digestOf('初版の事実', '古い本文');
  // 根拠が変わらない → 再評価しない（空欄が無ければ何もしない。ここでは必須項目の空欄があるので補充のみ）
  const same = planFill(reader, diffEvidence(before, before));
  assert.equal(same?.kind, 'add');
  assert.ok(!same?.onlyItems.includes('STORY'));
  // 出典本文が増えた → 既存の文・未確認項目を含めて再評価
  const after = digestOf('初版の事実', '古い本文。新しく追加された出典の段落。');
  const diff = diffEvidence(before, after);
  assert.deepEqual(diff.changedSourceIds, ['s1']);
  const plan = planFill(reader, diff);
  assert.equal(plan?.kind, 'reevaluate');
  assert.ok(plan!.onlyItems.includes('STORY'), '既存の文が再評価に入る');
  assert.ok(plan!.onlyItems.includes('REVENUE_ESTIMATE'), '「未確認」の売上が再評価に入る');
  assert.ok(plan!.onlyItems.includes('CAPITAL_AND_TEAM'), '事実が無く未確認の体制が再評価に入る');
  assert.deepEqual(plan!.extra.unknownItems, ['REVENUE_ESTIMATE', 'CAPITAL_AND_TEAM']);
  assert.deepEqual(plan!.extra.weakItems, ['REVENUE_ESTIMATE']);
});

test('事実の追加・変更も新しい根拠。根拠が減っただけなら再評価しない', () => {
  const b = digestEvidence([{ id: 'f1', kind: 'DESCRIPTION', text: 'a' }, { id: 'f2', kind: 'CHANNEL', text: 'b' }], [{ id: 'm1', line: 'x' }], { s1: 't' });
  const added = digestEvidence([{ id: 'f1', kind: 'DESCRIPTION', text: 'a' }, { id: 'f2', kind: 'CHANNEL', text: 'b' }, { id: 'f3', kind: 'TOOL', text: 'c' }], [{ id: 'm1', line: 'x' }], { s1: 't' });
  assert.deepEqual(diffEvidence(b, added).newFactIds, ['f3']);
  const edited = digestEvidence([{ id: 'f1', kind: 'DESCRIPTION', text: 'a2' }, { id: 'f2', kind: 'CHANNEL', text: 'b' }], [{ id: 'm1', line: 'x' }], { s1: 't' });
  assert.deepEqual(diffEvidence(b, edited).changedFactIds, ['f1']);
  const removed = digestEvidence([{ id: 'f1', kind: 'DESCRIPTION', text: 'a' }], [], {});
  assert.equal(diffEvidence(b, removed).hasNew, false);
  assert.equal(planFill(readerOf({ analysis: [] }), diffEvidence(b, removed))?.kind, 'add');
  assert.equal(reevaluationTargets(readerOf({}), []).items.length, 0);
});

test('再評価の結果（re-*.json）は同じ項目の既存を置き換え、add-* は既存を残す', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rawitems-'));
  const w = (f: string, items: unknown[]) => writeFileSync(join(dir, f), JSON.stringify({ analysis: [{ entityId: 'e1', items }] }));
  w('batch-001.json', [{ item: 'STORY', text: '旧' }, { item: 'LESSON', text: '旧L' }]);
  w('add-001.json', [{ item: 'STORY', text: '補充（先勝ちで捨てる前提）' }, { item: 'CHANNELS', text: '補充' }]);
  w('re-001.json', [{ item: 'STORY', text: '新根拠で書き直し' }]);
  const items = loadRawItems(dir).get('e1') as { item: string; text: string }[];
  assert.equal(items.filter((i) => i.item === 'STORY').length, 1, 'STORY は再評価の1件だけ');
  assert.equal(items.find((i) => i.item === 'STORY')!.text, '新根拠で書き直し');
  assert.equal(items.find((i) => i.item === 'LESSON')!.text, '旧L');
  assert.ok(items.some((i) => i.item === 'CHANNELS'));
});
