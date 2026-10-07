import { describe, expect, it } from 'vitest';
import { manifestObjectKey, createCatalogMembership, parseManifest, parsePointer, type PointerLogEntry, type ReleasePointer } from '@/shared/catalog-manifest';
import { advanceReleasePointer, pointerLogKey, type PointerStore } from './release-pointer';

const A = 'a'.repeat(64);
const B = 'b'.repeat(64);

function memoryStore(initial?: ReleasePointer) {
  let current = initial ? { pointer: initial, etag: 'e1' } : null;
  const logs: PointerLogEntry[] = [];
  const writes: Array<{ pointer: ReleasePointer; expectedEtag: string | null }> = [];
  const store: PointerStore = {
    async read() { return current; },
    async write(pointer, expectedEtag) {
      if ((current?.etag ?? null) !== expectedEtag) throw new Error('concurrent modification');
      writes.push({ pointer, expectedEtag });
      current = { pointer, etag: `e${writes.length + 1}` };
    },
    async log(entry) { logs.push(entry); },
  };
  return { store, logs, writes, now: () => current };
}

describe('公開版の目印を進める', () => {
  it('初めての設定は、前の版なしで書き、記録を1件残す', async () => {
    const m = memoryStore();
    const result = await advanceReleasePointer(m.store, { manifestHash: A, publishedCount: 10 }, new Date('2026-10-08T01:02:03.456Z'));
    expect(result).toEqual({ status: 'ADVANCED', from: null, to: A });
    expect(m.writes[0].expectedEtag).toBeNull();
    expect(m.now()?.pointer).toMatchObject({ manifestHash: A, manifestKey: manifestObjectKey(A), previous: null });
    expect(m.logs).toEqual([{ version: 1, at: '2026-10-08T01:02:03.456Z', from: null, to: A, publishedCount: 10 }]);
  });

  it('版Aから版Bに進めると、前の版と時刻を目印に残し、いつ・どこからどこへを記録する', async () => {
    const first = memoryStore();
    await advanceReleasePointer(first.store, { manifestHash: A, publishedCount: 10 }, new Date('2026-10-08T00:00:00Z'));
    const m = memoryStore(first.now()!.pointer);
    const result = await advanceReleasePointer(m.store, { manifestHash: B, publishedCount: 12 }, new Date('2026-10-09T00:00:00Z'));
    expect(result).toEqual({ status: 'ADVANCED', from: A, to: B });
    expect(m.writes[0].expectedEtag).toBe('e1');
    expect(m.now()?.pointer.previous).toEqual({ manifestHash: A, updatedAt: '2026-10-08T00:00:00.000Z' });
    expect(m.logs[0]).toMatchObject({ from: A, to: B, at: '2026-10-09T00:00:00.000Z', publishedCount: 12 });
  });

  it('同じ版を指している時は目印を書かず、記録だけ置き直す（記録の書き込みが落ちた後の復旧）', async () => {
    const first = memoryStore();
    await advanceReleasePointer(first.store, { manifestHash: A, publishedCount: 10 });
    const m = memoryStore(first.now()!.pointer);
    expect(await advanceReleasePointer(m.store, { manifestHash: A, publishedCount: 10 })).toEqual({ status: 'UNCHANGED', to: A });
    expect(m.writes).toHaveLength(0);
    expect(m.logs).toEqual(first.logs);
  });

  it('読んだ後に他で書き換えられていたら、上書きせずに失敗する', async () => {
    const m = memoryStore();
    const racing: PointerStore = { ...m.store, async read() { return { pointer: parsePointer({ version: 1, manifestHash: A, manifestKey: manifestObjectKey(A), publishedCount: 1, updatedAt: 'x', previous: null }), etag: 'stale' }; } };
    await expect(advanceReleasePointer(racing, { manifestHash: B, publishedCount: 1 })).rejects.toThrow('concurrent');
    expect(m.logs).toHaveLength(0);
  });

  it('記録の置き場所の名前は、時刻順に並び、版が違えば別になる', () => {
    const entry = (at: string, to: string): PointerLogEntry => ({ version: 1, at, from: null, to, publishedCount: 1 });
    expect(pointerLogKey('p/', entry('2026-10-08T00:00:00.000Z', A))).not.toBe(pointerLogKey('p/', entry('2026-10-08T00:00:00.000Z', B)));
    expect(pointerLogKey('p/', entry('2026-10-08T00:00:00.000Z', A)) < pointerLogKey('p/', entry('2026-10-09T00:00:00.000Z', A))).toBe(true);
  });
});

describe('目印と目録の形', () => {
  it('目印は置き場所が指紋と食い違うものを受け付けない', () => {
    expect(() => parsePointer({ version: 1, manifestHash: A, manifestKey: 'views/other.json.gz', publishedCount: 1, updatedAt: 'x', previous: null })).toThrow('Invalid release pointer');
  });
  it('目録は、事例の数と詳細の指紋がそろっていない時に受け付けない', () => {
    const base = { version: 1, sourceHash: A, sourceCount: 1, publishedCount: 1, summaries: { hash: A, key: 'k' }, discovery: { hash: B, key: 'k' }, details: { ent_a: A }, approvalCandidateIds: [] };
    expect(parseManifest(base).details).toEqual({ ent_a: A });
    expect(() => parseManifest({ ...base, publishedCount: 2 })).toThrow('details');
    expect(() => parseManifest({ ...base, details: { ent_a: 'short' } })).toThrow('details');
  });
  it('事例の判定は大文字小文字を区別せず、目録に無い事例を通さない', () => {
    const m = createCatalogMembership({ ent_a: A });
    expect(m.isCatalogId(' ENT_A ')).toBe(true);
    expect(m.canonicalCatalogId('ENT_A')).toBe('ent_a');
    expect(m.catalogDetailHash('ent_a')).toBe(A);
    expect(m.isCatalogId('ent_b')).toBe(false);
    expect(m.isCatalogId('')).toBe(false);
    expect(m.filterToCatalog([{ id: 'ent_a' }, { id: 'ent_b' }])).toEqual([{ id: 'ent_a' }]);
  });
});
