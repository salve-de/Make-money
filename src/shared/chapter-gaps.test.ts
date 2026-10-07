import { describe, expect, it } from 'vitest';
import { chapterGaps } from './chapter-gaps';
import { textFingerprint } from './list-lines';

const e = (entityId: string, factHash: string) => ({ entityId, factId: 'f1', factHash });
const live = (entries: Record<string, string>) => new Map(Object.entries(entries).map(([id, text]) => [id, [{ id: 'f1', text }]]));

describe('chapterGaps', () => {
  it('章なし・古い章・表示できる章を分ける', () => {
    const h = textFingerprint('文A');
    const gaps = chapterGaps(['a', 'b', 'c'], [e('a', h), e('b', 'old')], [e('a', h), e('b', 'new')], live({ a: '文A', b: '文B' }));
    expect(gaps).toEqual({ missing: ['c'], stale: ['b'], ready: ['a'] });
  });
  it('一覧の文が無い事例の章は古い扱い', () => {
    expect(chapterGaps(['a'], [e('a', 'h1')], [], live({ a: '文' })).stale).toEqual(['a']);
  });
  it('元の事実が変わり、一覧の文が古いままでも、画面に出ない章は古い扱い', () => {
    const h = textFingerprint('旧文');
    expect(chapterGaps(['a'], [e('a', h)], [e('a', h)], live({ a: '新文' })).stale).toEqual(['a']);
  });
});
