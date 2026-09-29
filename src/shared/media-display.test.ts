import { describe, expect, it } from 'vitest';
import { MEDIA_ASSET_KINDS, MEDIA_ENTITY_ID_PATTERN } from './media-asset-schema';
import {
  MEDIA_API_MAX_ENTITIES,
  MEDIA_ENTITY_ID_RE,
  PUBLIC_MEDIA_RESPONSE_SCHEMA,
  isMediaEntityId,
  isSafeMediaUrl,
  mediaQueryString,
  parsePublicMediaResponse,
  pickEntityLogo,
  pickGalleryAssets,
  type PublicMediaAsset,
} from './media-display';

function asset(kind: PublicMediaAsset['kind'], suffix: string, retrievedAt = '2026-09-29T00:38:11.808Z'): PublicMediaAsset {
  return {
    assetId: `ma_${suffix.padEnd(24, '0')}`,
    kind,
    url: `/api/media/file?entity_id=ent_keyence&asset=ma_${suffix.padEnd(24, '0')}`,
    contentType: 'image/png',
    width: 1280,
    height: 800,
    attribution: '出典: キーエンス (KEYENCE) 公式サイト (https://www.keyence.co.jp/)',
    sourcePageUrl: 'https://www.keyence.co.jp/',
    retrievedAt,
  };
}

describe('constants that mirror the ledger schema', () => {
  it('uses the same entity id alphabet as the schema module', () => {
    expect(MEDIA_ENTITY_ID_RE.source).toBe(MEDIA_ENTITY_ID_PATTERN.source);
  });

  it('knows exactly the asset kinds of the schema module', () => {
    const parsed = parsePublicMediaResponse({
      schema: PUBLIC_MEDIA_RESPONSE_SCHEMA,
      entities: { ent_a: MEDIA_ASSET_KINDS.map((kind, index) => asset(kind, String(index))) },
    });
    expect(parsed.ent_a.map((item) => item.kind)).toEqual([...MEDIA_ASSET_KINDS]);
  });
});

describe('pickEntityLogo', () => {
  it('prefers logo, then favicon, then og_image, and ignores everything else', () => {
    const og = asset('og_image', 'a');
    const favicon = asset('favicon', 'b');
    const logo = asset('logo', 'c');
    const shot = asset('screenshot_home', 'd');
    expect(pickEntityLogo([shot, og])).toBe(og);
    expect(pickEntityLogo([shot, og, favicon])).toBe(favicon);
    expect(pickEntityLogo([shot, og, favicon, logo])).toBe(logo);
    expect(pickEntityLogo([shot])).toBeNull();
    expect(pickEntityLogo([])).toBeNull();
    expect(pickEntityLogo(undefined)).toBeNull();
  });

  it('takes the newest image when a kind was captured twice', () => {
    const older = asset('favicon', 'a', '2026-09-01T00:00:00.000Z');
    const newer = asset('favicon', 'b', '2026-09-29T00:00:00.000Z');
    expect(pickEntityLogo([newer, older])).toBe(newer);
    expect(pickEntityLogo([older, newer])).toBe(newer);
  });
});

describe('pickGalleryAssets', () => {
  it('returns home screenshot, pricing screenshot and og:image in that order, one per kind, without icons', () => {
    const items = [asset('favicon', '1'), asset('og_image', '2'), asset('screenshot_pricing', '3'), asset('screenshot_home', '4'), asset('screenshot_product', '5')];
    expect(pickGalleryAssets(items).map((item) => item.kind)).toEqual(['screenshot_home', 'screenshot_pricing', 'og_image']);
    expect(pickGalleryAssets([asset('favicon', '1')])).toEqual([]);
    expect(pickGalleryAssets(undefined)).toEqual([]);
  });
});

describe('request helpers', () => {
  it('builds a bounded query of valid, distinct entity ids', () => {
    expect(mediaQueryString(['ent_a', 'ent_a', 'bad id', 'ent_b-c', '../x'])).toBe('entity_id=ent_a&entity_id=ent_b-c');
    expect(mediaQueryString(Array.from({ length: 100 }, (_, i) => `ent_${i}`)).split('&')).toHaveLength(MEDIA_API_MAX_ENTITIES);
    expect(mediaQueryString([])).toBe('');
  });

  it('recognises ledger entity ids', () => {
    expect(isMediaEntityId('ent_ebizfacts_stevehanovmultiplesaas10kmonthcheapstack_5425bcdb3286')).toBe(true);
    for (const bad of ['', 'keyence', 'ent_a/b', 'ent_a.b', 'ent_a b', `ent_${'x'.repeat(200)}`, 3, null]) expect(isMediaEntityId(bad)).toBe(false);
  });
});

describe('isSafeMediaUrl', () => {
  it('accepts the dev file route and https URLs only', () => {
    expect(isSafeMediaUrl('/api/media/file?entity_id=ent_a&asset=ma_0')).toBe(true);
    expect(isSafeMediaUrl('https://assets.example.com/media/ent_a/abc.png')).toBe(true);
    for (const bad of ['http://assets.example.com/a.png', 'javascript:alert(1)', 'data:image/png;base64,AAAA', '//evil.example/a.png', '/other/path', 'https://user:pw@example.com/a.png', 42, '']) {
      expect(isSafeMediaUrl(bad)).toBe(false);
    }
  });
});

describe('parsePublicMediaResponse', () => {
  const good = asset('favicon', 'f');

  it('keeps well-formed assets of well-formed entity ids', () => {
    expect(parsePublicMediaResponse({ schema: PUBLIC_MEDIA_RESPONSE_SCHEMA, source: 'local_staging', available: true, entities: { ent_keyence: [good] } })).toEqual({ ent_keyence: [good] });
  });

  it('drops anything malformed and shows nothing when the source is unavailable', () => {
    const noAttribution = { ...good, attribution: '  ' };
    const badUrl = { ...good, assetId: 'ma_' + '1'.repeat(24), url: 'javascript:alert(1)' };
    const badLink = { ...good, assetId: 'ma_' + '2'.repeat(24), sourcePageUrl: 'javascript:alert(1)' };
    const badKind = { ...good, assetId: 'ma_' + '3'.repeat(24), kind: 'selfie' };
    const body = { schema: PUBLIC_MEDIA_RESPONSE_SCHEMA, entities: { ent_keyence: [good, noAttribution, badUrl, badLink, badKind, null, 'x'], 'not an id': [good], ent_empty: [noAttribution] } };
    expect(parsePublicMediaResponse(body)).toEqual({ ent_keyence: [good] });
    expect(parsePublicMediaResponse({ ...body, available: false })).toEqual({});
    expect(parsePublicMediaResponse({ ...body, schema: 'other' })).toEqual({});
    for (const junk of [null, undefined, 'x', 3, [], { entities: [] }, { schema: PUBLIC_MEDIA_RESPONSE_SCHEMA, entities: null }]) expect(parsePublicMediaResponse(junk)).toEqual({});
  });
});
