import { describe, expect, it } from 'vitest';
import { buildGridItems, generationHeading, generationOf, groupByGeneration, isGenerationHeading } from './generation';

const e = (id: string, generation?: number) => ({ id, generation });

describe('世代の区切り', () => {
  it('世代が無い事例は第1世代', () => {
    expect(generationOf(e('a'))).toBe(1);
    expect(generationOf(e('a', 0))).toBe(1);
    expect(generationOf(e('a', 2.5))).toBe(1);
    expect(generationOf(e('a', 3))).toBe(3);
  });

  it('新しい世代が上、同じ世代の中は渡された並びのまま', () => {
    const groups = groupByGeneration([e('a'), e('b', 3), e('c', 2), e('d'), e('f', 3)]);
    expect(groups.map((g) => [g.generation, g.entities.map((x) => x.id)])).toEqual([
      [3, ['b', 'f']],
      [2, ['c']],
      [1, ['a', 'd']],
    ]);
  });

  it('見出しは短く件数つき', () => {
    expect(generationHeading(1, 10)).toBe('第1世代（10件）');
    expect(generationHeading(2, 1234)).toBe('第2世代（1,234件）');
  });

  it('絞り込んで1世代だけ残っても見出しは出る', () => {
    const items = buildGridItems([e('c', 2)], 250);
    expect(items).toEqual([
      { kind: 'heading', generation: 2, count: 1 },
      { kind: 'row', entity: e('c', 2), index: 0 },
    ]);
  });

  it('表示件数の上限は行だけを数え、上限に届いた世代以降の見出しは出さない', () => {
    const items = buildGridItems([e('a', 2), e('b', 2), e('c')], 2);
    expect(items.map((i) => (i.kind === 'heading' ? `H${i.generation}:${i.count}` : i.entity.id))).toEqual(['H2:2', 'a', 'b']);
  });

  it('読み込み途中でも、見出しの件数は世代の全体の件数を出す', () => {
    const items = buildGridItems([e('a', 2), e('b')], 250, { 2: 500, 1: 12 });
    expect(items.filter((i) => i.kind === 'heading')).toEqual([
      { kind: 'heading', generation: 2, count: 500 },
      { kind: 'heading', generation: 1, count: 12 },
    ]);
  });

  it('0件なら何も出さない', () => {
    expect(buildGridItems([], 250)).toEqual([]);
  });
});

describe('世代の見出しの判定（出どころの検査で飾りとして許可する）', () => {
  it('generationHeading が作る形は許可し、似た別の文字は許可しない', () => {
    expect(isGenerationHeading(generationHeading(1, 1))).toBe(true);
    expect(isGenerationHeading(generationHeading(2, 1234))).toBe(true);
    expect(isGenerationHeading('第1世代（1件）好きな文')).toBe(false);
    expect(isGenerationHeading('第0世代（1件）')).toBe(false);
    expect(isGenerationHeading('創業者は第1世代（1件）と言った')).toBe(false);
  });
});
