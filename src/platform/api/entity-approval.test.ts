import { describe, expect, it, vi } from 'vitest';
import { approveEntities } from './entity-approval';

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const noToken = async () => null;

describe('PR20 approval request contract', () => {
  it('sends exactly one request for a complete normalized batch', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ success: true, entityIds: ['a', 'b'] }));
    await approveEntities([' A ', 'b', 'a'], fetcher, noToken);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ entityIds: ['a', 'b'] });
  });

  it('attaches a fresh Firebase bearer token when one is available', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ success: true, entityIds: ['a'] }));
    const tokenProvider = vi.fn().mockResolvedValue('firebase-id-token');
    await approveEntities(['a'], fetcher, tokenProvider);
    expect(tokenProvider).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer firebase-id-token' },
    });
  });

  it('does not send an empty batch or request a token', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const tokenProvider = vi.fn().mockResolvedValue('unused');
    await approveEntities([], fetcher, tokenProvider);
    expect(fetcher).not.toHaveBeenCalled();
    expect(tokenProvider).not.toHaveBeenCalled();
  });

  it.each([400, 401, 403, 404, 409, 500, 503])('rejects HTTP %s rather than reporting local success', async (status) => {
    await expect(approveEntities(
      ['a'],
      vi.fn<typeof fetch>().mockResolvedValue(json({ success: true, entityIds: ['a'] }, status)),
      noToken,
    )).rejects.toThrow();
  });

  it.each([{ success: false, entityIds: ['a'] }, { success: true, entityIds: [] }, { success: true }, null])(
    'rejects a failed or incomplete acknowledgement',
    async (body) => {
      await expect(approveEntities(['a'], vi.fn<typeof fetch>().mockResolvedValue(json(body)), noToken)).rejects.toThrow();
    },
  );

  it('propagates transport failures and malformed JSON', async () => {
    await expect(approveEntities(['a'], vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')), noToken)).rejects.toThrow('offline');
    await expect(approveEntities(['a'], vi.fn<typeof fetch>().mockResolvedValue(new Response('not JSON')), noToken)).rejects.toThrow();
  });
});
