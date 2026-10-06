import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pickGalleryAssets, type PublicMediaAsset } from '@/shared/media-display';
import { EntityMediaGalleryView } from './EntityMediaGallery';

function asset(kind: PublicMediaAsset['kind'], suffix: string, attribution = '出典: キーエンス (KEYENCE) 公式サイト (https://www.keyence.co.jp/)'): PublicMediaAsset {
  return {
    assetId: `ma_${suffix.padEnd(24, '0')}`,
    kind,
    url: `https://assets.example.com/media/ent_keyence/${suffix}.png`,
    contentType: 'image/png',
    width: 1200,
    height: 630,
    attribution,
    sourcePageUrl: 'https://www.keyence.co.jp/',
    retrievedAt: '2026-09-29T00:38:11.808Z',
  };
}

const render = (assets: PublicMediaAsset[]) => renderToStaticMarkup(<EntityMediaGalleryView entityName="キーエンス (KEYENCE)" assets={assets} />);

describe('EntityMediaGalleryView', () => {
  it('renders nothing when the case has no displayable image', () => {
    expect(render([])).toBe('');
  });

  it('shows every image lazily, with its source text under it and a description of what it is', () => {
    const html = render(pickGalleryAssets([asset('screenshot_pricing', 'b', '出典: Photo AI 公式サイト (https://photoai.com/pricing)'), asset('screenshot_product', 'a'), asset('og_image', 'x'), asset('favicon', 'f')]));
    expect(html).toContain('id="section-media"');
    expect(html).toContain('aria-label="製品の画面"');
    expect(html).not.toContain('Product images');
    expect((html.match(/data-testid="media-gallery-image"/g) ?? []).length).toBe(2);
    expect((html.match(/loading="lazy"/g) ?? []).length).toBe(2);
    expect(html).toContain('alt="キーエンス (KEYENCE)の公式サイトの料金ページ"');
    expect(html).toContain('alt="キーエンス (KEYENCE)の公式サイトの製品画面"');
    expect(html).toContain('出典: Photo AI 公式サイト (https://photoai.com/pricing)');
    expect(html).toContain('出典: キーエンス (KEYENCE) 公式サイト (https://www.keyence.co.jp/)');
    expect(html).toContain('aspect-ratio:1200 / 630');
    expect(html).toContain('referrerPolicy="no-referrer"');
    // every caption sits in the same figure as its image, after it
    const figures = html.split('<figure').slice(1);
    expect(figures).toHaveLength(2);
    for (const figure of figures) expect(figure.indexOf('<img')).toBeLessThan(figure.indexOf('media-gallery-attribution'));
  });

  it('並べるのは小さな画像だけ（拡大・大きな背景にしない）。画面写真は高さ96px、アイコンは48px', () => {
    const html = render([asset('screenshot_home', 'b'), asset('app_icon', 'i')]);
    expect(html).toContain('h-24');
    expect(html).toContain('h-12');
    expect(html).not.toMatch(/h-(3[2-9]|[4-9]\d)\b/);
    expect(html).not.toContain('grid-cols');
  });

  it('does not show the favicon in the gallery (it is the list logo)', () => {
    expect(render(pickGalleryAssets([asset('favicon', 'f')]))).toBe('');
  });

  it('gives every image a source link and an origin label, and caps the display size', () => {
    const storeAsset = { ...asset('store_screenshot', 's'), sourcePageUrl: 'https://apps.apple.com/us/app/photo-app/id111222333', attribution: '出典: Photo App App Store 掲載画像 (https://apps.apple.com/us/app/photo-app/id111222333)' };
    const iconAsset = { ...asset('app_icon', 'i'), sourcePageUrl: 'https://apps.apple.com/us/app/photo-app/id111222333', width: 512, height: 512 };
    const html = render(pickGalleryAssets([asset('screenshot_product', 'a'), iconAsset, storeAsset]));
    expect((html.match(/data-testid="media-gallery-source-link"/g) ?? []).length).toBe(3);
    expect(html).toContain('href="https://apps.apple.com/us/app/photo-app/id111222333"');
    expect(html).toContain('href="https://www.keyence.co.jp/"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('［公式サイト］');
    expect(html).toContain('［App Store 掲載画像］');
    // 128px for the icon, 480px for previews and store images
    expect(html).toContain('max-width:128px');
    expect(html).toContain('max-width:480px');
  });
});
