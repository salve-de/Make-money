import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeCatalogArtifact } from './catalog-release';

describe('immutable catalog release', () => {
  it('reads only the exact accepted bytes', () => {
    const text = JSON.stringify({ name: 'テスト', value: 123 });
    const hash = createHash('sha256').update(text).digest('hex');
    expect(decodeCatalogArtifact(gzipSync(text), hash)).toEqual({ name: 'テスト', value: 123 });
    expect(() => decodeCatalogArtifact(gzipSync(text.replace('123', '456')), hash)).toThrow('hash mismatch');
  });
  it('rejects corrupt compressed content', () => {
    expect(() => decodeCatalogArtifact(new Uint8Array([1, 2, 3]), 'a'.repeat(64))).toThrow();
  });
});
