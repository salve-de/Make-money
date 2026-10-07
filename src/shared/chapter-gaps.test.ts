import { describe, expect, it } from 'vitest';
import { chapterGaps } from './chapter-gaps';

const e = (entityId: string, factHash: string) => ({ entityId, factId: 'f1', factHash });

describe('chapterGaps', () => {
  it('章なし・古い章・表示できる章を分ける', () => {
    const gaps = chapterGaps(['a', 'b', 'c'], [e('a', 'h1'), e('b', 'old')], [e('a', 'h1'), e('b', 'new')]);
    expect(gaps).toEqual({ missing: ['c'], stale: ['b'], ready: ['a'] });
  });
  it('一覧の文が無い事例の章は古い扱い', () => {
    expect(chapterGaps(['a'], [e('a', 'h1')], []).stale).toEqual(['a']);
  });
});
