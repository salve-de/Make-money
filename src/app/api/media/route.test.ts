import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { review, stageEntity } from '@/lib/media/media-test-fixtures';
import { parsePublicMediaResponse } from '@/shared/media-display';

const mocks = vi.hoisted(() => ({ source: vi.fn(), reader: vi.fn() }));
vi.mock('@/lib/media/runtime', () => ({ readMediaSource: mocks.source, publicMediaReaderFor: mocks.reader }));

import { GET } from './route';
import { GET as GET_FILE } from './file/route';

const ENTITY = 'ent_keyence';
let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'media-route-'));
  mocks.source.mockResolvedValue({ kind: 'local_staging', root });
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const request = (query: string, path = '/api/media') => new Request(`http://localhost${path}?${query}`);

describe('GET /api/media', () => {
  it('rejects a missing, malformed or oversized id list', async () => {
    for (const query of ['', 'entity_id=', 'entity_id=keyence', 'entity_id=ent_a/b', 'entity_id=ent_a&entity_id=../x', ...[`entity_id=ent_${'x'.repeat(200)}`], Array.from({ length: 41 }, (_, i) => `entity_id=ent_${i}`).join('&')]) {
      expect((await GET(request(query))).status, query).toBe(400);
    }
  });

  it('bounds the query it is willing to read', async () => {
    const many = Array.from({ length: 2000 }, () => 'entity_id=ent_a').join('&');
    expect((await GET(request(many))).status).toBe(400);
    expect((await GET(request(`entity_id=ent_a&x=${'y'.repeat(9000)}`))).status).toBe(400);
  });

  it('returns the displayable images of the requested entities and nothing of held or blocked ones', async () => {
    const [favicon, home, og] = await stageEntity(root, ENTITY, [
      { kind: 'favicon', bytes: Buffer.from('f') },
      { kind: 'screenshot_home', bytes: Buffer.from('h') },
      { kind: 'og_image', bytes: Buffer.from('o') },
    ]);
    await review(root, ENTITY, favicon, 'allowed');
    await review(root, ENTITY, og, 'blocked', { subjectIsPerson: true, note: '人物' });
    const response = await GET(request(`entity_id=${ENTITY}&entity_id=ent_photoai`));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const text = await response.text();
    expect(Object.keys(parsePublicMediaResponse(JSON.parse(text)))).toEqual([ENTITY]);
    expect(text).toContain(favicon.assetId);
    expect(text).not.toContain(home.assetId);
    expect(text).not.toContain(og.assetId);
    expect(text).not.toContain('目視');
    expect(text).not.toContain('owner-delegated');
  });

  it('shows nothing in production without a public domain', async () => {
    mocks.source.mockResolvedValue({ kind: 'foundation_public', publicDomain: null });
    const body = await (await GET(request(`entity_id=${ENTITY}`))).json();
    expect(body).toMatchObject({ available: false, entities: {} });
  });
});

describe('GET /api/media/file', () => {
  it('streams an allowed image with hardening headers and 404s everything else', async () => {
    const [favicon, home] = await stageEntity(root, ENTITY, [{ kind: 'favicon', bytes: Buffer.from('favicon-bytes') }, { kind: 'screenshot_home', bytes: Buffer.from('home') }]);
    await review(root, ENTITY, favicon, 'allowed');

    const ok = await GET_FILE(request(`entity_id=${ENTITY}&asset=${favicon.assetId}`, '/api/media/file'));
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toBe('image/png');
    expect(ok.headers.get('x-content-type-options')).toBe('nosniff');
    expect(ok.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(Buffer.from(await ok.arrayBuffer())).toEqual(Buffer.from('favicon-bytes'));

    expect((await GET_FILE(request(`entity_id=${ENTITY}&asset=${home.assetId}`, '/api/media/file'))).status).toBe(404); // held
    expect((await GET_FILE(request(`entity_id=${ENTITY}&asset=ma_${'0'.repeat(24)}`, '/api/media/file'))).status).toBe(404);
    expect((await GET_FILE(request(`entity_id=../secrets&asset=${favicon.assetId}`, '/api/media/file'))).status).toBe(400);
    expect((await GET_FILE(request(`entity_id=${ENTITY}&asset=..%2F..%2Fmanifest`, '/api/media/file'))).status).toBe(400);
    mocks.source.mockResolvedValue({ kind: 'foundation_public', publicDomain: 'https://assets.example.com' });
    expect((await GET_FILE(request(`entity_id=${ENTITY}&asset=${favicon.assetId}`, '/api/media/file'))).status).toBe(404);
  });
});
