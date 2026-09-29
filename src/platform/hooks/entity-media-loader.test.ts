import { describe, expect, it, vi } from 'vitest';
import { MEDIA_API_MAX_ENTITIES, PUBLIC_MEDIA_RESPONSE_SCHEMA, type PublicMediaAsset } from '@/shared/media-display';
import { createEntityMediaLoader } from './entity-media-loader';

const asset = (entityId: string): PublicMediaAsset => ({
  assetId: 'ma_' + 'a'.repeat(24),
  kind: 'favicon',
  url: `/api/media/file?entity_id=${entityId}&asset=ma_${'a'.repeat(24)}`,
  contentType: 'image/png',
  width: 32,
  height: 32,
  attribution: '出典: 公式サイト (https://example.com/)',
  sourcePageUrl: 'https://example.com/',
  retrievedAt: '2026-09-29T00:00:00.000Z',
});

const answer = (entities: Record<string, PublicMediaAsset[]>) => new Response(JSON.stringify({ schema: PUBLIC_MEDIA_RESPONSE_SCHEMA, source: 'local_staging', available: true, entities }), { status: 200 });

type Fetcher = (url: string) => Promise<Response>;

function harness(fetcher: Fetcher) {
  const flushes: (() => void)[] = [];
  const timers: (() => void)[] = [];
  const loader = createEntityMediaLoader({ fetcher, schedule: (run) => flushes.push(run), later: (run) => timers.push(run) });
  return { loader, flushes, timers, tick: () => flushes.splice(0).forEach((run) => run()) };
}

describe('createEntityMediaLoader', () => {
  it('sends the ids requested in the same tick as one request and resolves each with its own images', async () => {
    const fetcher = vi.fn<Fetcher>(async () => answer({ ent_a: [asset('ent_a')] }));
    const { loader, tick } = harness(fetcher);
    const a = loader.load('ent_a');
    const b = loader.load('ent_b');
    const again = loader.load('ent_a');
    tick();
    expect(await a).toEqual([asset('ent_a')]);
    expect(await b).toEqual([]);
    expect(await again).toEqual([asset('ent_a')]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('/api/media?entity_id=ent_a&entity_id=ent_b');
  });

  it('asks for an id only once, and splits a big batch into requests of the API limit', async () => {
    const fetcher = vi.fn<Fetcher>(async () => answer({}));
    const { loader, tick } = harness(fetcher);
    const ids = Array.from({ length: MEDIA_API_MAX_ENTITIES * 2 + 5 }, (_, i) => `ent_${i}`);
    const loads = [...ids, ...ids].map((id) => loader.load(id));
    tick();
    await Promise.all(loads);
    expect(fetcher).toHaveBeenCalledTimes(3);
    const sizes = fetcher.mock.calls.map(([url]) => url.split('&').length);
    expect(sizes).toEqual([MEDIA_API_MAX_ENTITIES, MEDIA_API_MAX_ENTITIES, 5]);
    await loader.load('ent_0');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('never sends ids the API would reject', async () => {
    const fetcher = vi.fn<Fetcher>(async () => answer({}));
    const { loader, flushes } = harness(fetcher);
    expect(await loader.load('../etc')).toEqual([]);
    expect(await loader.load('keyence')).toEqual([]);
    expect(flushes).toHaveLength(0);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('treats a failed request as "no images" and forgets it later so that another look can retry', async () => {
    const fetcher = vi.fn<Fetcher>().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(answer({ ent_a: [asset('ent_a')] }));
    const { loader, tick, timers } = harness(fetcher);
    const first = loader.load('ent_a');
    tick();
    expect(await first).toEqual([]);
    expect(timers).toHaveLength(1);
    expect(await loader.load('ent_a')).toEqual([]); // still remembered
    expect(fetcher).toHaveBeenCalledTimes(1);

    timers.splice(0).forEach((run) => run());
    const retry = loader.load('ent_a');
    tick();
    expect(await retry).toEqual([asset('ent_a')]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('treats an HTTP error or a malformed body as "no images"', async () => {
    for (const response of [new Response('{}', { status: 503 }), new Response('not json', { status: 200 }), new Response(JSON.stringify({ schema: 'other' }), { status: 200 })]) {
      const { loader, tick } = harness(async () => response);
      const pending = loader.load('ent_a');
      tick();
      expect(await pending).toEqual([]);
    }
  });
});
