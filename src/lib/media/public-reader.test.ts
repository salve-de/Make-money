import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { PUBLIC_MEDIA_MANIFEST_SCHEMA, publicManifestKey, type PublicMediaManifest } from '../../shared/media-public-manifest';
import { createPublicMediaReader, PUBLIC_MEDIA_DIRECTORY_TTL_MS, type PublicMediaObjectSource } from './public-reader';

const DOMAIN = 'https://assets.example.com';
const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);

function manifest(entityId: string, assets: { sha256: string; kind: 'favicon' | 'og_image'; extension?: string }[], asOf = '2026-09-29T10:00:00.000Z'): PublicMediaManifest {
  return {
    schema: PUBLIC_MEDIA_MANIFEST_SCHEMA,
    entityId,
    asOf,
    ledger: { manifestKey: `media/${entityId}/manifest.20260929T003811Z.json`, decisionsKey: null },
    assets: assets.map((asset) => ({
      assetId: `ma_${asset.sha256.slice(0, 24)}`,
      kind: asset.kind,
      key: `media/${entityId}/${asset.sha256}.${asset.extension ?? 'png'}`,
      sha256: asset.sha256,
      bytes: 2048,
      contentType: 'image/png',
      width: 32,
      height: 32,
      attribution: '出典: キーエンス (KEYENCE) 公式サイト (https://www.keyence.co.jp/)',
      sourcePageUrl: 'https://www.keyence.co.jp/',
      retrievedAt: '2026-09-29T00:38:11.808Z',
      reviewedAt: '2026-09-29T10:00:00.000Z',
    })),
  };
}

function fakeSource(objects: Record<string, unknown>) {
  const encode = (value: unknown) => new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value));
  const list = vi.fn(async (prefix: string) => Object.keys(objects).filter((key) => key.startsWith(prefix)));
  const read = vi.fn(async (key: string) => (key in objects ? encode(objects[key]) : null));
  const source: PublicMediaObjectSource = { list, read };
  return { source, list, read, objects };
}

describe('createPublicMediaReader', () => {
  it('turns the newest public manifest of an entity into public urls on the public domain', async () => {
    const { source } = fakeSource({
      [`media/ent_keyence/${SHA_A}.png`]: 'image bytes are never read',
      [publicManifestKey('ent_keyence', '20260929T100000Z')]: manifest('ent_keyence', [{ sha256: SHA_A, kind: 'favicon' }]),
      [publicManifestKey('ent_photoai', '20260929T101500Z')]: manifest('ent_photoai', [{ sha256: SHA_B, kind: 'og_image' }]),
    });
    const reader = createPublicMediaReader({ source, publicDomain: DOMAIN });
    const media = await reader.read(['ent_keyence', 'ent_nobody', 'not an id']);
    expect(Object.keys(media)).toEqual(['ent_keyence']);
    expect(media.ent_keyence).toEqual([
      {
        assetId: `ma_${SHA_A.slice(0, 24)}`,
        kind: 'favicon',
        url: `${DOMAIN}/media/ent_keyence/${SHA_A}.png`,
        contentType: 'image/png',
        width: 32,
        height: 32,
        attribution: '出典: キーエンス (KEYENCE) 公式サイト (https://www.keyence.co.jp/)',
        sourcePageUrl: 'https://www.keyence.co.jp/',
        retrievedAt: '2026-09-29T00:38:11.808Z',
      },
    ]);
    expect(Object.keys(await reader.read(['ent_photoai', 'ent_keyence'])).sort()).toEqual(['ent_keyence', 'ent_photoai']);
  });

  it('follows the newest manifest, so a takedown that lists nothing hides an image an older manifest still lists', async () => {
    const { source } = fakeSource({
      [publicManifestKey('ent_keyence', '20260929T100000Z')]: manifest('ent_keyence', [{ sha256: SHA_A, kind: 'favicon' }]),
      [publicManifestKey('ent_keyence', '20260929T120000Z')]: manifest('ent_keyence', [], '2026-09-29T12:00:00.000Z'),
    });
    expect(await createPublicMediaReader({ source, publicDomain: DOMAIN }).read(['ent_keyence'])).toEqual({});
  });

  it('shows nothing when the newest manifest is unreadable or invalid, rather than falling back to an older one', async () => {
    const good = manifest('ent_keyence', [{ sha256: SHA_A, kind: 'favicon' }]);
    for (const newest of ['{not json', { ...good, extra: 1 }, manifest('ent_other', [{ sha256: SHA_A, kind: 'favicon' }]), { ...good, assets: [{ ...good.assets[0], key: `media/ent_keyence/${SHA_B}.png` }] }]) {
      const { source } = fakeSource({
        [publicManifestKey('ent_keyence', '20260929T100000Z')]: good,
        [publicManifestKey('ent_keyence', '20260929T120000Z')]: newest,
      });
      expect(await createPublicMediaReader({ source, publicDomain: DOMAIN }).read(['ent_keyence'])).toEqual({});
    }
    const missing = fakeSource({ [publicManifestKey('ent_keyence', '20260929T100000Z')]: good });
    const reader = createPublicMediaReader({ source: { ...missing.source, read: async () => null }, publicDomain: DOMAIN });
    expect(await reader.read(['ent_keyence'])).toEqual({});
  });

  it('caches the listing for a minute and parsed manifests for good', async () => {
    let clock = 1_000_000;
    const { source, list, read, objects } = fakeSource({ [publicManifestKey('ent_keyence', '20260929T100000Z')]: manifest('ent_keyence', [{ sha256: SHA_A, kind: 'favicon' }]) });
    const reader = createPublicMediaReader({ source, publicDomain: DOMAIN, now: () => clock });
    await reader.read(['ent_keyence']);
    await reader.read(['ent_keyence']);
    expect(list).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledTimes(1);

    // A takedown is published as a newer manifest; it is picked up when the listing expires.
    objects[publicManifestKey('ent_keyence', '20260929T120000Z')] = manifest('ent_keyence', [], '2026-09-29T12:00:00.000Z');
    clock += PUBLIC_MEDIA_DIRECTORY_TTL_MS - 1;
    expect(Object.keys(await reader.read(['ent_keyence']))).toEqual(['ent_keyence']);
    clock += 2;
    expect(await reader.read(['ent_keyence'])).toEqual({});
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('without a public domain, points images at the app and serves only bytes the newest manifest lists', async () => {
    const image = new TextEncoder().encode('png bytes');
    const sha = createHash('sha256').update(image).digest('hex');
    const listed = manifest('ent_keyence', [{ sha256: sha, kind: 'favicon' }]);
    listed.assets[0].bytes = image.byteLength;
    const assetId = listed.assets[0].assetId;
    const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
    const objects: Record<string, Uint8Array> = {
      [publicManifestKey('ent_keyence', '20260929T100000Z')]: encode(listed),
      [`media/ent_keyence/${sha}.png`]: image,
      [`media/ent_keyence/${SHA_B}.png`]: new TextEncoder().encode('never listed'),
    };
    const source: PublicMediaObjectSource = {
      list: async (prefix) => Object.keys(objects).filter((key) => key.startsWith(prefix)),
      read: async (key) => objects[key] ?? null,
    };
    const reader = createPublicMediaReader({ source, publicDomain: null });
    expect((await reader.read(['ent_keyence'])).ent_keyence.map((asset) => asset.url)).toEqual([`/api/media/file?entity_id=ent_keyence&asset=${assetId}`]);
    expect(await reader.readFile('ent_keyence', assetId)).toEqual({ bytes: image, contentType: 'image/png' });
    expect(await reader.readFile('ent_keyence', `ma_${SHA_B.slice(0, 24)}`)).toBeNull();
    expect(await reader.readFile('ent_other', assetId)).toBeNull();

    // Bytes that no longer match the manifest are refused.
    objects[`media/ent_keyence/${sha}.png`] = new TextEncoder().encode('png bytez');
    expect(await reader.readFile('ent_keyence', assetId)).toBeNull();
  });

  it('lets a failing store surface (the route answers 503) instead of returning a partial answer', async () => {
    const source: PublicMediaObjectSource = { list: async () => { throw new Error('R2 unavailable'); }, read: async () => null };
    await expect(createPublicMediaReader({ source, publicDomain: DOMAIN }).read(['ent_keyence'])).rejects.toThrow(/R2 unavailable/);
  });
});
