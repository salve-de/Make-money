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
    const response = await fetchBusinessDetailResponse(fetcher, { targetId: 'ent_x' });
    expect(response.status).toBe(404);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
