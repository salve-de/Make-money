import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import type { ReaderCase } from '../src/shared/reader-case';
import { analysisHash } from './reader-case/analysis-lib';
import { reevaluationTargets } from './reader-case/evidence-digest';

const readerOf = (over: Partial<ReaderCase>): ReaderCase => ({ sources: [], facts: [], metrics: [], unknowns: [], analysis: [], ...over }) as unknown as ReaderCase;

test('弱い項目の判定は確度ラベルに依らない（根拠が空の文＝弱い。confidence が無い新しい推論でも拾う）', () => {
  const reader = readerOf({
    analysis: [
      { id: 'a-1', item: 'STORY', text: '根拠のある文。', basis: ['f1'] },
      { id: 'a-2', item: 'COMPETITION', text: '根拠の無い文。', basis: [] },
      { id: 'a-3', item: 'TOOLS', text: '確度 HIGH でも根拠が空なら弱い。', basis: [], confidence: 'HIGH' },
    ] as unknown as ReaderCase['analysis'],
  });
  assert.deepEqual(reevaluationTargets(reader, []).weakItems, ['COMPETITION', 'TOOLS']);
});

test('分析の指紋: 確度ラベルの無い新しい項目は付いた旧データと混ざらず、付いた旧データの指紋は変わらない', () => {
  const ev = { facts: [], metrics: [], sources: [] };
  const base = { item: 'STORY', text: 't', basis: ['f1'] };
  const legacy = analysisHash([{ ...base, confidence: 'HIGH' }], undefined, ev);
  assert.equal(legacy, createHash('sha256').update(JSON.stringify([[['STORY', 't', '', ['f1'], 'HIGH']], null, ev])).digest('hex').slice(0, 16));
  assert.notEqual(analysisHash([base], undefined, ev), legacy);
  assert.equal(analysisHash([base], undefined, ev), analysisHash([{ ...base }], undefined, ev));
});
