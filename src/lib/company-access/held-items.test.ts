import { describe, expect, it } from 'vitest';
import type { ReaderCase } from '@/shared/reader-case';
import { textFingerprint } from '@/shared/list-lines';
import { heldChapterRemovals, withoutHeldClaims, withoutHeldDisplay, type HeldRecord } from '../../../scripts/reader-case/held-items';

const reader = {
  sources: [{ id: 's1', url: 'https://example.com/a', publisher: 'x', kind: 'OFFICIAL', retrievedAt: '2026-10-01' }],
  facts: [
    { id: 'f1', kind: 'DESCRIPTION', text: '残る事実。', sourceId: 's1', attribution: 'SELF_REPORTED' },
    { id: 'f2', kind: 'OTHER', text: '保留の事実。750人になった。', sourceId: 's1', attribution: 'SELF_REPORTED' },
  ],
  metrics: [],
  unknowns: [],
  summaryFactId: 'f1',
  analysis: [
    { id: 'a1', item: 'WHY_IT_WORKED', text: '残る推論。', basis: ['f1'] },
    { id: 'a2', item: 'WHY_IT_WORKED', text: '保留の事実に頼る推論。', basis: ['f1', 'f2'] },
  ],
} as unknown as ReaderCase;

const heldFact: HeldRecord = { key: 'e|fact|f2', entityId: 'e', kind: 'fact', id: 'f2', text: '保留の事実。750人になった。', sourceUrl: 'https://example.com/a', reasons: ['NUMBER_NOT_IN_SOURCE'], heldAt: '2026-10-08' };

describe('保留の事実を公開版から外す', () => {
  it('保留の事実と、それに頼る推論だけを外し、ほかは残す', () => {
    const r = withoutHeldClaims(reader, [heldFact]);
    expect(r.reader.facts.map((f) => f.id)).toEqual(['f1']);
    expect(r.reader.analysis.map((a) => a.id)).toEqual(['a1']);
    expect(r.removed).toHaveLength(1);
    expect(r.removed[0].dependents).toEqual(['analysis:a2']);
    expect(r.removedIds.has('f2')).toBe(true);
  });

  it('文が直されて保留の時と違う文なら、もう保留ではないので外さない', () => {
    const r = withoutHeldClaims(reader, [{ ...heldFact, text: '前の文。' }]);
    expect(r.reader.facts).toHaveLength(2);
    expect(r.removed).toHaveLength(0);
  });

  it('保留が無ければ何も変えない', () => {
    expect(withoutHeldClaims(reader, []).reader).toBe(reader);
  });

  it('保留の事実に頼る画面の文を外し、ほかの文は残す', () => {
    const cut = withoutHeldClaims(reader, [heldFact]);
    const display = {
      listLine: { factId: 'f2', factHash: 'h', text: '保留に頼る一行' },
      summaryRest: { factId: 'f1', factHash: 'h', text: '残る概要' },
      successPoints: [{ head: 'a', body: 'b', factId: 'f2', factHash: 'h' }, { head: 'c', body: 'd', factId: 'f1', factHash: 'h' }],
      detailLines: [{ analysisId: 'a2', textHash: 'h', answer: '消える' }, { analysisId: 'a1', textHash: 'h', answer: '残る' }],
    };
    const out = withoutHeldDisplay(display, cut.removedIds, [heldFact], cut.removed)!;
    expect(out.listLine).toBeUndefined();
    expect(out.summaryRest?.text).toBe('残る概要');
    expect(out.successPoints).toHaveLength(1);
    expect(out.detailLines?.map((d) => d.analysisId)).toEqual(['a1']);
    expect(cut.removed[0].dependents).toContain('display:listLine');
  });

  it('保留の章の行だけを章から外す', () => {
    const held: HeldRecord = { key: 'e|chapter|c:x', entityId: 'e', kind: 'chapter', id: `c:${textFingerprint('保留の章の行')}`, text: '保留の章の行', sourceUrl: 'u', reasons: ['NUMBER_NOT_IN_SOURCE'], heldAt: '2026-10-08', chapter: 'c' };
    const display = { chapters: { factId: 'f1', factHash: 'h', chapters: { c: [{ text: '保留の章の行', source: 'u' }, { text: '残る行', source: 'u' }] } } };
    expect(heldChapterRemovals(display, [held])).toHaveLength(1);
    const out = withoutHeldDisplay(display, new Set(), [held])!;
    expect(out.chapters?.chapters.c.map((r) => r.text)).toEqual(['残る行']);
  });
});
