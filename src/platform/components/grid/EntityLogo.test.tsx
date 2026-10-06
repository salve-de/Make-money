import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PublicMediaAsset } from '@/shared/media-display';
import { EntityLogo } from './EntityLogo';

const asset = (kind: PublicMediaAsset['kind']): PublicMediaAsset => ({
  assetId: 'ma_' + 'a'.repeat(24),
  kind,
  url: '/api/media/file?entity_id=ent_keyence&asset=ma_aaaaaaaaaaaaaaaaaaaaaaaa',
  contentType: 'image/png',
  width: 152,
  height: 152,
  attribution: '出典: キーエンス (KEYENCE) 公式サイト (https://www.keyence.co.jp/)',
  sourcePageUrl: 'https://www.keyence.co.jp/',
  retrievedAt: '2026-09-29T00:38:11.808Z',
});

describe('EntityLogo', () => {
  it('renders nothing without a displayable image', () => {
    expect(renderToStaticMarkup(<EntityLogo asset={null} />)).toBe('');
    expect(renderToStaticMarkup(<EntityLogo asset={undefined} />)).toBe('');
  });

  it('renders a 20px decorative image with the source in its tooltip', () => {
    const html = renderToStaticMarkup(<EntityLogo asset={asset('favicon')} />);
    expect(html).toContain('data-testid="entity-logo"');
    expect(html).toContain('width="20"');
    expect(html).toContain('height="20"');
    expect(html).toContain('alt=""');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('title="出典: キーエンス (KEYENCE) 公式サイト (https://www.keyence.co.jp/)"');
    expect(html).toContain('object-contain');
  });

  it('crops a wide og:image instead of squeezing it', () => {
    expect(renderToStaticMarkup(<EntityLogo asset={asset('og_image')} />)).toContain('object-cover');
  });

  it('renders the inspector header mark at 20px on phones and 24px on PC, under its own test id', () => {
    const html = renderToStaticMarkup(<EntityLogo asset={asset('favicon')} variant="header" />);
    expect(html).toContain('data-testid="entity-header-logo"');
    expect(html).not.toContain('data-testid="entity-logo"');
    expect(html).toContain('width="24"');
    expect(html).toContain('h-5 w-5 lg:h-6 lg:w-6');
    expect(html).toContain('title="出典: キーエンス (KEYENCE) 公式サイト (https://www.keyence.co.jp/)"');
  });

  it('社名を渡すと、画像が無い時は頭文字の丸を出す（白い四角にしない）', () => {
    const html = renderToStaticMarkup(<EntityLogo asset={null} name="HeyGen" />);
    expect(html).toContain('data-testid="entity-initial"');
    expect(html).toContain('data-initial="H"');
    expect(html).toContain('rounded-full');
    expect(renderToStaticMarkup(<EntityLogo asset={asset('favicon')} name="HeyGen" />)).toContain('data-testid="entity-logo"');
  });
});
