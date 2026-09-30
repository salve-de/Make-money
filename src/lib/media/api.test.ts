import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PUBLIC_MEDIA_RESPONSE_SCHEMA, parsePublicMediaResponse } from '../../shared/media-display';
import { buildMediaResponse, serveMediaFile } from './api';
import { review, stageEntity } from './media-test-fixtures';
import type { PublicMediaReader } from './public-reader';

const ENTITY = 'ent_keyence';
let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'media-api-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const noReader = { publicReader: () => { throw new Error('the public reader must not be used'); } };
const silent = { report: () => undefined };

describe('buildMediaResponse', () => {
  it('local staging: answers with exactly what the browser-side parser accepts, uncached', async () => {
    const [favicon, og] = await stageEntity(root, ENTITY, [{ kind: 'favicon', bytes: Buffer.from('f') }, { kind: 'og_image', bytes: Buffer.from('o') }]);
    await review(root, ENTITY, favicon, 'allowed');
    await review(root, ENTITY, og, 'held');
    const result = await buildMediaResponse([ENTITY], { kind: 'local_staging', root }, { ...noReader, ...silent });
    expect(result.status).toBe(200);
    expect(result.cacheControl).toBe('no-store');
    expect(result.body).toMatchObject({ schema: PUBLIC_MEDIA_RESPONSE_SCHEMA, source: 'local_staging', available: true });
    expect(parsePublicMediaResponse(result.body)[ENTITY].map((asset) => asset.assetId)).toEqual([favicon.assetId]);
  });

  it('foundation-public: reads through the reader for the configured domain', async () => {
    const reader: PublicMediaReader = { read: vi.fn(async () => ({})) };
    const publicReader = vi.fn(() => reader);
    const result = await buildMediaResponse(['ent_a', 'ent_b'], { kind: 'foundation_public', publicDomain: 'https://assets.example.com' }, { publicReader });
    expect(publicReader).toHaveBeenCalledWith('https://assets.example.com');
    expect(reader.read).toHaveBeenCalledWith(['ent_a', 'ent_b']);
    expect(result.body).toMatchObject({ source: 'foundation_public', available: true, entities: {} });
    expect(result.cacheControl).toBe('private, max-age=60');
  });

  it('shows nothing, and says why, without a public domain or when media is off', async () => {
    const noDomain = await buildMediaResponse(['ent_a'], { kind: 'foundation_public', publicDomain: null }, noReader);
    expect(noDomain.body).toMatchObject({ source: 'foundation_public', available: false, entities: {} });
    expect((noDomain.body as { reason: string }).reason).toMatch(/CLOUDFLARE_R2_PUBLIC_DOMAIN/);
    const off = await buildMediaResponse(['ent_a'], { kind: 'off' }, noReader);
    expect(off.body).toMatchObject({ source: 'off', available: false, entities: {} });
    expect(parsePublicMediaResponse(noDomain.body)).toEqual({});
  });

  it('answers 503 (uncached) when the source fails', async () => {
    const seen: string[] = [];
    const result = await buildMediaResponse(['ent_a'], { kind: 'foundation_public', publicDomain: 'https://assets.example.com' }, {
      publicReader: () => ({ read: async () => { throw new Error('R2 unavailable'); } }),
      report: (_id, message) => seen.push(message),
    });
    expect(result).toEqual({ status: 503, cacheControl: 'no-store', body: { error: 'Media temporarily unavailable' } });
    expect(seen[0]).toMatch(/R2 unavailable/);
  });
});

describe('serveMediaFile', () => {
  it('serves staged files only from the local source', async () => {
    const [favicon] = await stageEntity(root, ENTITY, [{ kind: 'favicon', bytes: Buffer.from('f') }]);
    await review(root, ENTITY, favicon, 'allowed');
    expect((await serveMediaFile(ENTITY, favicon.assetId, { kind: 'local_staging', root }, () => undefined))?.bytes).toEqual(Buffer.from('f'));
    expect(await serveMediaFile(ENTITY, favicon.assetId, { kind: 'foundation_public', publicDomain: 'https://assets.example.com' })).toBeNull();
    expect(await serveMediaFile(ENTITY, favicon.assetId, { kind: 'off' })).toBeNull();
  });
});
