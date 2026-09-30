import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import type { PublicMediaAsset } from '@/shared/media-display';
import { MobileFeedCard } from './MobileFeedCard';

const logo: PublicMediaAsset = {
  assetId: 'ma_' + 'a'.repeat(24),
  kind: 'favicon',
  url: '/api/media/file?entity_id=ent_keyence&asset=ma_aaaaaaaaaaaaaaaaaaaaaaaa',
  contentType: 'image/png',
  width: 152,
  height: 152,
  attribution: '出典: キーエンス (KEYENCE) 公式サイト (https://www.keyence.co.jp/)',
  sourcePageUrl: 'https://www.keyence.co.jp/',
  retrievedAt: '2026-09-29T00:38:11.808Z',
};

const render = (props: { logo?: PublicMediaAsset | null }) => renderToStaticMarkup(
  <MobileFeedCard entity={INSTITUTIONAL_ENTITIES[0]} isSelected={false} onSelect={() => undefined} currency="JPY"
    onToggleBookmark={() => undefined} isBookmarked={false} {...props} />,
);

describe('MobileFeedCard logo', () => {
  it('puts the approved logo in front of the name, and shows nothing extra without one', () => {
    const withLogo = render({ logo });
    expect(withLogo).toContain('data-testid="entity-logo"');
    expect(withLogo.indexOf('data-testid="entity-logo"')).toBeLessThan(withLogo.indexOf('data-testid="entity-name"'));
    expect(render({})).not.toContain('entity-logo');
    expect(render({ logo: null })).not.toContain('entity-logo');
  });
});
