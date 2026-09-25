import { describe, expect, it, vi } from 'vitest';
import { businessDetailRequestUrls, fetchBusinessDetailResponse } from './foundation-detail-request';

describe('Foundation detail request planning', () => {
  it('uses only the lightweight Foundation path for a known Foundation-only entity', () => {
    expect(businessDetailRequestUrls({
      targetId: 'ent_org_foundation',
      knownCurated: false,
      knownFoundation: true,
    })).toEqual([
      '/api/businesses?entity_id=ent_org_foundation&foundationOnly=true',
    ]);
  });

  it('keeps a known curated entity on the normal detail path', () => {
    expect(businessDetailRequestUrls({
      targetId: 'ent_curated',
      latestDossierHash: 'a'.repeat(64),
      knownCurated: true,
      knownFoundation: true,
    })).toEqual([
      `/api/businesses?entity_id=ent_curated&dossier_hash=${'a'.repeat(64)}`,
    ]);
  });

  it('tries Foundation first for an unresolved deep link, then falls back only on 404', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Entity not found' }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ source: 'local_fallback' }), { status: 200 }));

    const response = await fetchBusinessDetailResponse(fetcher, {
      targetId: 'ent_deep_link',
      knownCurated: false,
      knownFoundation: false,
    });

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      '/api/businesses?entity_id=ent_deep_link&foundationOnly=true',
    );
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      '/api/businesses?entity_id=ent_deep_link',
    );
  });

  it('lets an unresolved deep link try the normal detail path when Foundation returns 503', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Foundation detail temporarily unavailable' }), { status: 503 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ source: 'local_fallback' }), { status: 200 }),
      );

    const response = await fetchBusinessDetailResponse(fetcher, {
      targetId: 'ent_deep_link',
      knownCurated: false,
      knownFoundation: false,
    });

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      '/api/businesses?entity_id=ent_deep_link',
    );
  });

  it('does not fall through on 503 for a known Foundation-only entity', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Foundation detail temporarily unavailable' }), { status: 503 }),
    );

    const response = await fetchBusinessDetailResponse(fetcher, {
      targetId: 'ent_known_foundation',
      knownCurated: false,
      knownFoundation: true,
    });

    expect(response.status).toBe(503);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      '/api/businesses?entity_id=ent_known_foundation&foundationOnly=true',
    );
  });

  it('does not mask a non-404/503 Foundation failure with normal fallback', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Bad projection' }), { status: 500 }),
    );

    const response = await fetchBusinessDetailResponse(fetcher, {
      targetId: 'ent_deep_link',
      knownCurated: false,
      knownFoundation: false,
    });

    expect(response.status).toBe(500);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
