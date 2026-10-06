'use client';

import React, { useState } from 'react';
import type { PublicMediaAsset } from '@/shared/media-display';

/**
 * The 20px mark in front of a company name in a list row: the entity's own logo / favicon / og:image,
 * only when the server has vetted it (allowed, not a person). Renders nothing without one, and nothing if the
 * file fails to load. The attribution is in the tooltip; the full text is shown with the larger images in the inspector.
 */
/** `row`: 20px のマーク（一覧の行）。`header`: 詳細の見出しの社名の前（スマホ 20px、PC 24px）。 */
export function EntityLogo({ asset, variant = 'row' }: { asset: PublicMediaAsset | null | undefined; variant?: 'row' | 'header' }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!asset || failedUrl === asset.url) return null;
  return (
    // A vetted official image served by our own route or the public R2 domain; the Next image optimizer is not part of the Workers deploy.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid={variant === 'header' ? 'entity-header-logo' : 'entity-logo'}
      src={asset.url}
      alt=""
      width={variant === 'header' ? 24 : 20}
      height={variant === 'header' ? 24 : 20}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      title={asset.attribution}
      onError={() => setFailedUrl(asset.url)}
      className={`${variant === 'header' ? 'h-5 w-5 lg:h-6 lg:w-6' : 'h-5 w-5'} shrink-0 rounded-[3px] border border-white/[0.14] bg-white ${asset.kind === 'og_image' ? 'object-cover' : 'object-contain'}`}
    />
  );
}
