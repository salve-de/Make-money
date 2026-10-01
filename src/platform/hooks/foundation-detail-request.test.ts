import { describe, expect, it, vi } from 'vitest';
import { businessDetailRequestUrls, fetchBusinessDetailResponse } from './foundation-detail-request';

describe('詳細の取得先は公開目録の /api/businesses だけ', () => {
  it('ハッシュ無しは entity_id だけ', () => {
    expect(businessDetailRequestUrls({ targetId: 'ent_a' })).toEqual(['/api/businesses?entity_id=ent_a']);
  });

  it('ハッシュ付きは dossier_hash を付ける', () => {
    expect(businessDetailRequestUrls({ targetId: 'ent_a', latestDossierHash: 'a'.repeat(64) }))
      .toEqual([`/api/businesses?entity_id=ent_a&dossier_hash=${'a'.repeat(64)}`]);
  });

  it('404 でも別の経路に落とさず、そのまま返す', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 404 }));
    const response = await fetchBusinessDetailResponse(fetcher, { targetId: 'ent_x' }, { retryDelaysMs: [] });
    expect(response.status).toBe(404);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('一時的な失敗（Workers 1102 = 503、500）は取り直して、通ったものを返す', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('error code: 1102', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ source: 'catalog_release' }), { status: 200 }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const response = await fetchBusinessDetailResponse(fetcher, { targetId: 'ent_a', latestDossierHash: 'b'.repeat(64) }, { retryDelaysMs: [1, 2], sleep });
    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map((call) => call[0])).toEqual([1, 2]);
  });

  it('通信エラーも取り直し、最後は直近の失敗を返す', async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(new Response('error code: 1102', { status: 503 }));
    const response = await fetchBusinessDetailResponse(fetcher, { targetId: 'ent_a' }, { retryDelaysMs: [0, 0], sleep: async () => undefined });
    expect(response.status).toBe(503);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('404 は取り直さない', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 404 }));
    await fetchBusinessDetailResponse(fetcher, { targetId: 'ent_a' }, { retryDelaysMs: [0, 0], sleep: async () => undefined });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
