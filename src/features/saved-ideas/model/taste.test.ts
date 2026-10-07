import { describe, expect, it } from 'vitest';

import { buildTaste, composeIdeas, similarCases, summaryLine, type TasteInput } from './taste';

const c = (id: string, genre: string | null, tags: string[], priceTypes: TasteInput['priceTypes'] = [], wins: TasteInput['wins'] = []): TasteInput => ({ id, name: `事例${id}`, genre, tags, priceTypes, wins });

const saved = [
  c('a', 'SaaS・ツール', ['完全1人', 'B2B'], ['MONTHLY']),
  c('b', 'SaaS・ツール', ['完全1人'], ['MONTHLY']),
  c('c', '通販', ['完全1人', 'B2B'], ['ONE_TIME']),
];

describe('saved taste', () => {
  it('2件以上に共通する特徴だけを、多い順に数える', () => {
    const taste = buildTaste(saved);
    expect(taste.saved).toBe(3);
    expect(taste.traits[0].label).toBe('完全1人');
    expect(taste.traits.find((t) => t.label === '完全1人')?.count).toBe(3);
    expect(taste.traits.find((t) => t.label === '通販')).toBeUndefined();
  });

  it('1行の要約は数えた件数だけで作る。共通が無ければ null', () => {
    expect(summaryLine(buildTaste(saved))).toContain('「完全1人」3件');
    expect(summaryLine(buildTaste([c('x', 'A', ['t1']), c('y', 'B', ['t2'])]))).toBeNull();
  });

  it('近い事例は、保存済みを除き好みの特徴を2つ以上持つものだけ', () => {
    const taste = buildTaste(saved);
    const rows = similarCases(taste, [...saved, c('d', 'SaaS・ツール', ['完全1人']), c('e', '通販', ['x'])], new Set(['a', 'b', 'c']));
    expect(rows.map((r) => r.id)).toEqual(['d']);
  });

  it('事業の案は2つ以上の特徴を組み合わせ、重複せず3つまで。特徴が足りなければ空', () => {
    const ideas = composeIdeas(buildTaste(saved));
    expect(ideas.length).toBeGreaterThan(0);
    expect(ideas.length).toBeLessThanOrEqual(3);
    for (const idea of ideas) expect(idea.traits.length).toBeGreaterThanOrEqual(2);
    expect(new Set(ideas.map((i) => i.traits.map((t) => t.label).join('|'))).size).toBe(ideas.length);
    expect(composeIdeas(buildTaste([c('x', null, [])]))).toEqual([]);
  });
});
