import { beforeEach, describe, expect, it, vi } from 'vitest';

const r2 = vi.hoisted(() => {
  class R2ConfigurationError extends Error {}
  class R2ObjectConflictError extends Error {}
  return {
    R2ConfigurationError,
    R2ObjectConflictError,
    isR2Configured: vi.fn(),
    assertR2BucketAvailable: vi.fn(),
    putR2ObjectCreateOnly: vi.fn(),
    readR2Object: vi.fn(),
  };
});
vi.mock('../storage/r2', () => r2);

import { createR2MediaStore } from './r2-media-store';

beforeEach(() => {
  r2.isR2Configured.mockReturnValue(true);
  r2.assertR2BucketAvailable.mockResolvedValue(undefined);
});

describe('createR2MediaStore', () => {
  it('refuses to start without credentials, before touching any bucket', async () => {
    r2.isR2Configured.mockReturnValue(false);
    await expect(createR2MediaStore().assertReady(['foundation-raw', 'foundation-public'])).rejects.toThrow(/with-r2-keychain-secrets/);
    expect(r2.assertR2BucketAvailable).not.toHaveBeenCalled();
  });

  it('checks that every bucket is reachable', async () => {
    await createR2MediaStore().assertReady(['foundation-raw', 'foundation-public']);
    expect(r2.assertR2BucketAvailable.mock.calls.map(([bucket]) => bucket)).toEqual(['foundation-raw', 'foundation-public']);
    r2.assertR2BucketAvailable.mockRejectedValueOnce(new Error('R2 bucket does not exist or is not reachable: foundation-public'));
    await expect(createR2MediaStore().assertReady(['foundation-public'])).rejects.toThrow(/foundation-public/);
  });

  it('maps the create-only outcomes and never treats a conflict as success', async () => {
    const store = createR2MediaStore();
    const input = { bucket: 'foundation-raw', key: 'media/ent_a/x.png', body: new Uint8Array([1]), contentType: 'image/png' };
    r2.putR2ObjectCreateOnly.mockResolvedValueOnce({ status: 'CREATED' });
    expect(await store.putCreateOnly(input)).toBe('created');
    r2.putR2ObjectCreateOnly.mockResolvedValueOnce({ status: 'EXISTS_IDENTICAL' });
    expect(await store.putCreateOnly(input)).toBe('identical');
    r2.putR2ObjectCreateOnly.mockRejectedValueOnce(new r2.R2ObjectConflictError('exists'));
    expect(await store.putCreateOnly(input)).toBe('conflict');
    r2.putR2ObjectCreateOnly.mockRejectedValueOnce(new Error('network down'));
    await expect(store.putCreateOnly(input)).rejects.toThrow(/network down/);
    expect(r2.putR2ObjectCreateOnly).toHaveBeenCalledWith(input);
  });

  it('reads objects back as bytes, or null when absent', async () => {
    const store = createR2MediaStore();
    r2.readR2Object.mockResolvedValueOnce({ exists: true, body: new Uint8Array([7, 8]) });
    expect(await store.read('foundation-raw', 'k')).toEqual(new Uint8Array([7, 8]));
    r2.readR2Object.mockResolvedValueOnce(null);
    expect(await store.read('foundation-raw', 'k')).toBeNull();
  });
});
