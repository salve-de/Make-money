import { describe, expect, it, vi } from 'vitest';
import { approveEntities } from './entity-approval';

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

describe('PR20 approval request contract', () => {
  it('sends exactly one request for a complete normalized batch', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ success: true, entityIds: ['a', 'b'] }));
    await approveEntities([' A ', 'b', 'a'], fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ entityIds: ['a', 'b'] });
  });
  it('does not send an empty batch', async () => {
    const fetcher = vi.fn<typeof fetch>();
    await approveEntities([], fetcher);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([400, 403, 404, 409, 500, 503])('rejects HTTP %s rather than reporting local success', async (status) => {
    await expect(approveEntities(['a'], vi.fn<typeof fetch>().mockResolvedValue(json({ success: true, entityIds: ['a'] }, status)))).rejects.toThrow();
  });
  it.each([{ success: false, entityIds: ['a'] }, { success: true, entityIds: [] }, { success: true }, null])('rejects a failed or incomplete acknowledgement', async (body) => {
    await expect(approveEntities(['a'], vi.fn<typeof fetch>().mockResolvedValue(json(body)))).rejects.toThrow();
  });
  it('propagates transport failures and malformed JSON', async () => {
    await expect(approveEntities(['a'], vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')))).rejects.toThrow('offline');
    await expect(approveEntities(['a'], vi.fn<typeof fetch>().mockResolvedValue(new Response('not JSON')))).rejects.toThrow();
  });
});
