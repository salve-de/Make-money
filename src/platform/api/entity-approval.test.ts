import { describe, expect, it, vi } from 'vitest';
import { approveEntities } from './entity-approval';
import { MAX_APPROVAL_IDS_PER_REQUEST } from '@/shared/entity-approval-contract';

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const noToken = async () => null;

function ackFetch() {
  return vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { entityIds: string[] };
    return json({ success: true, entityIds: body.entityIds });
  });
}

describe('PR20 approval request contract', () => {
  it('sends exactly one request for a complete normalized batch', async () => {
    const fetcher = ackFetch();
    await approveEntities([' A ', 'b', 'a'], fetcher, noToken);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ entityIds: ['a', 'b'] });
  });

  it('splits catalogs larger than one Worker invocation and acknowledges every chunk', async () => {
    const total = MAX_APPROVAL_IDS_PER_REQUEST + 201;
    const ids = Array.from({ length: total }, (_, index) => `ent-${index}`);
    const fetcher = ackFetch();
    const tokenProvider = vi.fn().mockResolvedValue('firebase-id-token');

    await approveEntities(ids, fetcher, tokenProvider);

    expect(tokenProvider).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const first = JSON.parse(String(fetcher.mock.calls[0][1]?.body)) as { entityIds: string[] };
    const second = JSON.parse(String(fetcher.mock.calls[1][1]?.body)) as { entityIds: string[] };
    expect(first.entityIds).toHaveLength(MAX_APPROVAL_IDS_PER_REQUEST);
    expect(second.entityIds).toHaveLength(201);
    expect([...first.entityIds, ...second.entityIds]).toEqual(ids);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ headers: { 'Content-Type': 'application/json', Authorization: 'Bearer firebase-id-token' } });
    expect(fetcher.mock.calls[1][1]).toMatchObject({ headers: { 'Content-Type': 'application/json', Authorization: 'Bearer firebase-id-token' } });
  });

  it('fails closed when a later chunk is not acknowledged', async () => {
    const ids = Array.from({ length: MAX_APPROVAL_IDS_PER_REQUEST + 1 }, (_, index) => `ent-${index}`);
    let call = 0;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      call += 1;
      const body = JSON.parse(String(init?.body)) as { entityIds: string[] };
      return call === 1
        ? json({ success: true, entityIds: body.entityIds })
        : json({ success: true, entityIds: [] });
    });
    await expect(approveEntities(ids, fetcher, noToken)).rejects.toThrow('Approval was not acknowledged');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('attaches a fresh Firebase bearer token when one is available', async () => {
    const fetcher = ackFetch();
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

  it('rejects malformed IDs before transport', async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(approveEntities(['../../etc/passwd'], fetcher, noToken)).rejects.toThrow('Invalid entity ID');
    expect(fetcher).not.toHaveBeenCalled();
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
