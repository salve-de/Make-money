import { describe, expect, it } from 'vitest';
import { displayForEntity, type DisplaySourceFiles } from './reader-display';
import { caseChaptersFor } from './case-chapters';
import { detailLineFor } from './detail-lines';
import { listLineFor, textFingerprint } from './list-lines';
import { successPointsFor } from './success-points';
import { summaryRestFor } from './summary-lines';

const fact = { id: 'f1', text: '元の要約です。続きです。' };
const hash = textFingerprint(fact.text);
const files: DisplaySourceFiles = {
  'list-lines': [{ entityId: 'e1', factId: 'f1', factHash: hash, text: '一覧の1行' }],
  'summary-lines': [{ entityId: 'e1', factId: 'f1', factHash: hash, text: '続きの編集文' }],
  'detail-lines': [
    { entityId: 'e1', analysisId: 'a1', textHash: textFingerprint('推論1'), answer: '答え1', note: '補足' },
    { entityId: 'e2', analysisId: 'a1', textHash: 'x', answer: '他の事例' },
  ],
  'success-points': [{ entityId: 'e1', points: [{ head: '見出し', body: '根拠', factId: 'f1', factHash: hash }] }],
  'case-chapters': [{ entityId: 'e1', factId: 'f1', factHash: hash, chapters: { practice: [{ text: '実際にやったこと', source: 'https://example.com' }], turning: undefined } }],
};

describe('画面用の編集文を事例ごとにまとめる', () => {
  it('正本5ファイルの該当事例の行だけを集め、画面の読み方がそのまま使える', () => {
    const display = displayForEntity(files, 'e1');
    expect(listLineFor(display, fact)).toBe('一覧の1行');
    expect(summaryRestFor(display, fact)).toBe('続きの編集文');
    expect(detailLineFor(display, { id: 'a1', text: '推論1' })).toEqual({ answer: '答え1', note: '補足', hidden: undefined });
    expect(successPointsFor(display, [fact])).toEqual([{ head: '見出し', body: '根拠', factId: fact.id }]);
    expect(caseChaptersFor(display, [fact]).map((c) => c.id)).toEqual(['practice']);
  });
  it('元の文が変わったら（指紋が合わなければ）使わず、元の文に戻る', () => {
    const display = displayForEntity(files, 'e1');
    const changed = { id: 'f1', text: '書き換えられた要約' };
    expect(listLineFor(display, changed)).toBeNull();
    expect(summaryRestFor(display, changed)).toBeNull();
    expect(successPointsFor(display, [changed])).toEqual([]);
    expect(caseChaptersFor(display, [changed])).toEqual([]);
    expect(detailLineFor(display, { id: 'a1', text: '別の推論' })).toBeNull();
  });
  it('編集文が無い事例には欄を付けない', () => {
    expect(displayForEntity(files, 'e9')).toBeUndefined();
    expect(listLineFor(undefined, fact)).toBeNull();
  });
});
