import { describe, expect, it } from 'vitest';
import { dropRows, localize, normalizeDisplay, withCodeYen, pruneUntilClean } from '../../scripts/reader-case/display-lenient';
import type { EntityDisplay, LiveReader } from './display-build';

const base = (): EntityDisplay => ({
  list: { entityId: 'e', factId: 'f1', factHash: 'h', text: '一覧の文' },
  summary: { entityId: 'e', factId: 'f1', factHash: 'h', text: '概要の文' },
  detail: [{ entityId: 'e', analysisId: 'a-story', textHash: 'x', answer: '物語の答え' }],
  success: { entityId: 'e', points: [{ head: '一つ目', body: '本文1', factId: 'f2', factHash: 'h' }, { head: '二つ目', body: '本文2', factId: 'f3', factHash: 'h' }] },
  chapters: { entityId: 'e', factId: 'f1', factHash: 'h', chapters: { timeline: [{ text: '2020年: 後', source: 'https://a' }, { text: '2018年: 前', source: 'https://a' }], price: [{ text: '月20ドル', source: 'https://a' }] } },
});
const reader = { analysis: [{ id: 'a-pivots', item: 'PIVOTS', text: '転機の推論' }] } as unknown as LiveReader;

describe('画面の文を寛容に仕上げる部品', () => {
  it('AIが付けた円換算を外し、コードで付け直す。年表は古い順にする', () => {
    expect(withCodeYen('月20ドル（約9,999円）')).toBe('月20ドル（約3,000円）');
    const n = normalizeDisplay(base());
    expect(n.chapters!.chapters.timeline!.map((r) => r.text)).toEqual(['2018年: 前', '2020年: 後']);
    expect(n.chapters!.chapters.price![0].text).toContain('約3,000円');
  });
  it('指摘を行に結ぶ', () => {
    const d = base();
    expect(localize('detail a-story: 材料に無い数字 5', d)).toEqual(['detail.a-story']);
    expect(localize('success「二つ目」: 材料に無い数字 5', d)).toEqual(['success.1']);
    expect(localize('chapters price「月20ドル」: 材料に無い数字 5', d)).toEqual(['chapters.price.0']);
    expect(localize('case-chapters e/price text: 6字（上限3）', d)).toEqual(['chapters.price.0']);
    expect(localize('list-lines e text: 50字（上限45）', d)).toEqual(['list']);
    expect(localize('success-points e: 2点（3〜5点にする）', d)).toEqual([]);
    expect(localize('知らない形の指摘', d)).toBeNull();
  });
  it('行を外す。分析欄は出さないにし、無い欄は出さない行を足す。一覧は外さない', () => {
    const out = dropRows(base(), new Set(['detail.a-story', 'detail.a-pivots', 'success.0', 'chapters.price.0', 'summary', 'list']), reader);
    expect(out.detail.map((l) => [l.analysisId, l.hidden])).toEqual([['a-story', true], ['a-pivots', true]]);
    expect(out.success!.points.map((p) => p.head)).toEqual(['二つ目']);
    expect(out.chapters!.chapters.price).toBeUndefined();
    expect(out.summary!.text).toBe('');
    expect(out.list!.text).toBe('一覧の文');
  });
  it('指摘が無くなるまで、指摘された行だけを外す', () => {
    const files = { 'list-lines': [], 'summary-lines': [], 'detail-lines': [], 'success-points': [], 'case-chapters': [] } as never;
    const r = pruneUntilClean({
      entityId: 'e', reader, files, display: base(),
      problemsOf: (d) => (d.success!.points.some((p) => p.head === '一つ目') ? ['success「一つ目」: 材料に無い数字 5'] : []),
    });
    expect(r.dropped.map((x) => x.id)).toEqual(['success.0']);
    expect(r.display.success!.points).toHaveLength(1);
    expect(r.leftover).toEqual([]);
  });
});
