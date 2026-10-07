import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { currentGeneration, generationOfAddition, mergeInto, readAdditions, type AdditionFile } from '../../../scripts/reader-case/add-entity-records';

const file = (id: string, generation?: number): AdditionFile => ({
  version: 1,
  source: { manifest: 'm', manifestSha256: 'x', artifactsDir: '', collectedAt: '2026-10-08T00:00:00Z', ...(generation ? { generation } : {}) },
  records: [{ id, provenance: { detailsHash: 'h', artifactSha256: 'a' }, record: { id, url: `https://${id}.example.com` } }],
});

describe('取り込みの世代', () => {
  it('ファイルに書いてあればそれ、無ければ名前の gen<N>-、どちらも無ければ第1世代', () => {
    expect(generationOfAddition('x.json', file('a', 4))).toBe(4);
    expect(generationOfAddition('gen3-foo.json', file('a'))).toBe(3);
    expect(generationOfAddition('catalog-392.json', file('a'))).toBe(1);
  });

  it('第2世代以上の事例の記録にだけ generation を付ける（第1世代の記録は変えない）', () => {
    const { next } = mergeInto([], [file('one', 1), file('two', 2), file('three', 3)]);
    expect(next.find((r) => r.id === 'one')).not.toHaveProperty('generation');
    expect(next.find((r) => r.id === 'two')?.generation).toBe(2);
    expect(next.find((r) => r.id === 'three')?.generation).toBe(3);
  });

  it('記録に古い generation があっても、取り込みファイルの世代で置き換える（第1世代なら外す）', () => {
    const withOld = (id: string, generation: number, fileGeneration: number): AdditionFile => {
      const f = file(id, fileGeneration);
      f.records[0].record.generation = generation;
      return f;
    };
    const { next } = mergeInto([], [withOld('x', 2, 3), withOld('y', 2, 1)]);
    expect(next.find((r) => r.id === 'x')?.generation).toBe(3);
    expect(next.find((r) => r.id === 'y')).not.toHaveProperty('generation');
  });

  it('ディレクトリから読むと名前の世代が入り、既定の世代は最大の世代になる', () => {
    const dir = mkdtempSync(join(tmpdir(), 'additions-'));
    try {
      writeFileSync(join(dir, 'old.json'), JSON.stringify(file('a')));
      writeFileSync(join(dir, 'gen2-b.json'), JSON.stringify(file('b')));
      writeFileSync(join(dir, 'gen3-c.json'), JSON.stringify(file('c')));
      expect(readAdditions(dir).map((f) => f.source.generation)).toEqual([2, 3, 1]);
      expect(currentGeneration(dir)).toBe(3);
      const merged = mergeInto([], readAdditions(dir)).next;
      expect(Object.fromEntries(merged.map((r) => [r.id, r.generation ?? 1]))).toEqual({ a: 1, b: 2, c: 3 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
